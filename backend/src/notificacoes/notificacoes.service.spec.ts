import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Aviso } from './avisos.js';
import type { EnviadorPush } from './enviador-push.js';
import type { InscricaoPush } from './inscricao-push.entity.js';
import { NotificacoesService } from './notificacoes.service.js';

const aviso: Aviso = {
  titulo: 'Nova coleta para você',
  corpo: 'WEG, hoje',
  url: '/motorista',
  tag: 'ordem-10',
};

const celular = {
  id: 1,
  usuarioId: 7,
  endpoint: 'https://fcm.googleapis.com/a',
  p256dh: 'p',
  auth: 'a',
};
const notebook = {
  id: 2,
  usuarioId: 7,
  endpoint: 'https://fcm.googleapis.com/b',
  p256dh: 'p',
  auth: 'a',
};

describe('NotificacoesService', () => {
  const inscricoes = {
    upsert: vi.fn(),
    delete: vi.fn(),
    findBy: vi.fn(),
  };
  const enviador = {
    chavePublica: 'chave-vapid' as string | null,
    enviar: vi.fn(),
  };
  const service = new NotificacoesService(
    inscricoes as unknown as Repository<InscricaoPush>,
    enviador as unknown as EnviadorPush,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    enviador.chavePublica = 'chave-vapid';
  });

  it('expõe a chave pública VAPID para o navegador se inscrever', () => {
    expect(service.chavePublica()).toEqual({ chavePublica: 'chave-vapid' });
  });

  it('inscrever grava ou atualiza a inscrição pelo endpoint', async () => {
    await service.inscrever(7, {
      endpoint: celular.endpoint,
      keys: { p256dh: 'p', auth: 'a' },
    });

    expect(inscricoes.upsert).toHaveBeenCalledWith(
      { usuarioId: 7, endpoint: celular.endpoint, p256dh: 'p', auth: 'a' },
      ['endpoint'],
    );
  });

  it('remover só apaga inscrições do próprio usuário', async () => {
    await service.remover(7, celular.endpoint);

    expect(inscricoes.delete).toHaveBeenCalledWith({
      usuarioId: 7,
      endpoint: celular.endpoint,
    });
  });

  describe('enviarParaUsuario', () => {
    it('não faz nada quando o push não está configurado', async () => {
      enviador.chavePublica = null;

      await service.enviarParaUsuario(7, aviso);

      expect(inscricoes.findBy).not.toHaveBeenCalled();
    });

    it('envia para todos os dispositivos inscritos do usuário', async () => {
      inscricoes.findBy.mockResolvedValue([celular, notebook]);
      enviador.enviar.mockResolvedValue('ENVIADO');

      await service.enviarParaUsuario(7, aviso);

      expect(inscricoes.findBy).toHaveBeenCalledWith({ usuarioId: 7 });
      expect(enviador.enviar).toHaveBeenCalledTimes(2);
      expect(enviador.enviar).toHaveBeenCalledWith(
        celular,
        JSON.stringify(aviso),
      );
      expect(inscricoes.delete).not.toHaveBeenCalled();
    });

    it('apaga as inscrições que o serviço de push informou como expiradas', async () => {
      inscricoes.findBy.mockResolvedValue([celular, notebook]);
      enviador.enviar
        .mockResolvedValueOnce('EXPIRADO')
        .mockResolvedValueOnce('FALHOU');

      await service.enviarParaUsuario(7, aviso);

      expect(inscricoes.delete).toHaveBeenCalledTimes(1);
      expect(inscricoes.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('nunca rejeita, para não desfazer a operação que originou o aviso', async () => {
      const registro = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      inscricoes.findBy.mockRejectedValue(new Error('banco fora do ar'));

      await expect(
        service.enviarParaUsuario(7, aviso),
      ).resolves.toBeUndefined();
      expect(registro).toHaveBeenCalledWith(
        expect.stringContaining('banco fora do ar'),
      );
      registro.mockRestore();
    });
  });
});
