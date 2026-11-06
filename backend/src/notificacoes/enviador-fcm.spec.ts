import { Logger } from '@nestjs/common';
import type { Aviso } from './avisos.js';
import {
  FirebaseEnviador,
  lerCredenciaisFirebase,
  mensagemFcm,
} from './enviador-fcm.js';

const { obterToken } = vi.hoisted(() => ({ obterToken: vi.fn() }));
vi.mock('google-auth-library', () => ({
  GoogleAuth: vi.fn(function GoogleAuthFalso() {
    return { getAccessToken: obterToken };
  }),
}));

const credenciais = {
  type: 'service_account',
  project_id: 'sigcf-teste',
  client_email: 'servidor@sigcf-teste.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};
const emBase64 = (valor: unknown) =>
  Buffer.from(JSON.stringify(valor)).toString('base64');

const aviso: Aviso = {
  titulo: 'Coleta disponível: quem pega?',
  corpo: 'WEG, hoje\nRua A, 100',
  url: '/motorista',
  tag: 'ordem-10',
};

function respostaDoFirebase(status: number, corpo: object = {}) {
  return new Response(JSON.stringify(corpo), { status });
}

describe('lerCredenciaisFirebase', () => {
  it('lê a chave do servidor guardada em base64', () => {
    expect(lerCredenciaisFirebase(emBase64(credenciais))).toMatchObject({
      project_id: 'sigcf-teste',
      client_email: credenciais.client_email,
    });
  });

  it.each([
    ['ausente', undefined],
    ['vazia', ''],
    ['que não é JSON', Buffer.from('lixo').toString('base64')],
    ['sem os campos da conta de serviço', emBase64({ project_id: 'x' })],
  ])('ignora a chave %s', (_, valor) => {
    expect(lerCredenciaisFirebase(valor)).toBeNull();
  });
});

describe('mensagemFcm', () => {
  it('monta o aviso para o Android, substituindo o anterior da mesma coleta', () => {
    expect(mensagemFcm('token-1', aviso)).toEqual({
      message: {
        token: 'token-1',
        notification: { title: aviso.titulo, body: aviso.corpo },
        data: { url: '/motorista', tag: 'ordem-10' },
        android: {
          priority: 'high',
          ttl: '43200s',
          notification: {
            tag: 'ordem-10',
            channel_id: 'coletas',
            icon: 'ic_notificacao',
            color: '#FACC15',
          },
        },
      },
    });
  });
});

describe('FirebaseEnviador', () => {
  let fetchFalso: ReturnType<typeof vi.fn>;
  let avisoNoLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    obterToken.mockResolvedValue('token-de-acesso');
    fetchFalso = vi.fn().mockResolvedValue(respostaDoFirebase(200));
    vi.stubGlobal('fetch', fetchFalso);
    avisoNoLog = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    avisoNoLog.mockRestore();
  });

  function enviadorConfigurado() {
    vi.stubEnv('FIREBASE_CREDENCIAIS_BASE64', emBase64(credenciais));
    return new FirebaseEnviador();
  }

  it('fica desligado sem a chave do servidor, sem tentar enviar', async () => {
    vi.stubEnv('FIREBASE_CREDENCIAIS_BASE64', '');
    const enviador = new FirebaseEnviador();

    expect(enviador.ativo).toBe(false);
    await expect(enviador.enviar('token-1', aviso)).resolves.toBe('FALHOU');
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('avisa no log quando a chave configurada é inválida', () => {
    vi.stubEnv('FIREBASE_CREDENCIAIS_BASE64', 'não é base64 de JSON');

    expect(new FirebaseEnviador().ativo).toBe(false);
    expect(avisoNoLog).toHaveBeenCalledWith(
      expect.stringContaining('FIREBASE_CREDENCIAIS_BASE64'),
    );
  });

  it('envia pela API HTTP v1 do Firebase, autenticado pela conta de serviço', async () => {
    const enviador = enviadorConfigurado();

    await expect(enviador.enviar('token-1', aviso)).resolves.toBe('ENVIADO');

    expect(enviador.ativo).toBe(true);
    expect(fetchFalso).toHaveBeenCalledWith(
      'https://fcm.googleapis.com/v1/projects/sigcf-teste/messages:send',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-de-acesso',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mensagemFcm('token-1', aviso)),
      },
    );
  });

  it('informa como expirado o aparelho que desinstalou o app', async () => {
    fetchFalso.mockResolvedValue(
      respostaDoFirebase(404, {
        error: {
          status: 'NOT_FOUND',
          details: [{ errorCode: 'UNREGISTERED' }],
        },
      }),
    );

    await expect(enviadorConfigurado().enviar('token-1', aviso)).resolves.toBe(
      'EXPIRADO',
    );
  });

  it('não descarta o aparelho por outros erros do Firebase, só registra no log', async () => {
    fetchFalso.mockResolvedValue(
      respostaDoFirebase(400, { error: { status: 'INVALID_ARGUMENT' } }),
    );

    await expect(enviadorConfigurado().enviar('token-1', aviso)).resolves.toBe(
      'FALHOU',
    );
    expect(avisoNoLog).toHaveBeenCalledWith(
      expect.stringContaining('INVALID_ARGUMENT'),
    );
  });

  it('nunca rejeita quando a rede ou a autenticação falham', async () => {
    obterToken.mockRejectedValue(new Error('sem rede'));

    await expect(enviadorConfigurado().enviar('token-1', aviso)).resolves.toBe(
      'FALHOU',
    );
    expect(avisoNoLog).toHaveBeenCalledWith(
      expect.stringContaining('sem rede'),
    );
  });
});
