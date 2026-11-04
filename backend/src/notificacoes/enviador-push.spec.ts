import { Logger } from '@nestjs/common';
import webpush, { WebPushError } from 'web-push';
import { WebPushEnviador } from './enviador-push.js';

vi.mock('web-push', async (importOriginal) => {
  const original = await importOriginal<{ default: object }>();
  return {
    ...original,
    default: { ...original.default, sendNotification: vi.fn() },
  };
});

const destino = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'chave-p256dh',
  auth: 'segredo-auth',
};

const erroDoServico = (statusCode: number) =>
  new WebPushError('falhou', statusCode, {}, '', destino.endpoint);

describe('WebPushEnviador', () => {
  const enviarNotificacao = vi.mocked(webpush.sendNotification);

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  describe('sem as chaves VAPID configuradas', () => {
    it('fica desativado e não tenta enviar', async () => {
      vi.stubEnv('VAPID_PUBLIC_KEY', '');
      const enviador = new WebPushEnviador();

      expect(enviador.chavePublica).toBeNull();
      await expect(enviador.enviar(destino, '{}')).resolves.toBe('FALHOU');
      expect(enviarNotificacao).not.toHaveBeenCalled();
    });
  });

  describe('com as chaves VAPID configuradas', () => {
    let enviador: WebPushEnviador;

    beforeEach(() => {
      vi.stubEnv('VAPID_SUBJECT', 'mailto:contato@sigcf.local');
      vi.stubEnv('VAPID_PUBLIC_KEY', 'chave-publica');
      vi.stubEnv('VAPID_PRIVATE_KEY', 'chave-privada');
      enviador = new WebPushEnviador();
    });

    it('expõe a chave pública', () => {
      expect(enviador.chavePublica).toBe('chave-publica');
    });

    it('envia com urgência alta e validade de 12 horas', async () => {
      enviarNotificacao.mockResolvedValue({} as never);

      await expect(enviador.enviar(destino, '{"titulo":"x"}')).resolves.toBe(
        'ENVIADO',
      );
      expect(enviarNotificacao).toHaveBeenCalledWith(
        {
          endpoint: destino.endpoint,
          keys: { p256dh: 'chave-p256dh', auth: 'segredo-auth' },
        },
        '{"titulo":"x"}',
        {
          vapidDetails: {
            subject: 'mailto:contato@sigcf.local',
            publicKey: 'chave-publica',
            privateKey: 'chave-privada',
          },
          TTL: 43_200,
          urgency: 'high',
        },
      );
    });

    it.each([404, 410])(
      'trata a resposta %i como inscrição expirada',
      async (status) => {
        enviarNotificacao.mockRejectedValue(erroDoServico(status));

        await expect(enviador.enviar(destino, '{}')).resolves.toBe('EXPIRADO');
      },
    );

    it.each([
      ['erro temporário do serviço', erroDoServico(500)],
      ['falha de rede', new Error('ECONNRESET')],
    ])('registra %s e devolve FALHOU', async (_, erro) => {
      const aviso = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      enviarNotificacao.mockRejectedValue(erro);

      await expect(enviador.enviar(destino, '{}')).resolves.toBe('FALHOU');
      expect(aviso).toHaveBeenCalled();
      aviso.mockRestore();
    });
  });
});
