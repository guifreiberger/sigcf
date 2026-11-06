import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { AparelhoApp } from './aparelho-app.entity.js';
import type { Aviso } from './avisos.js';
import type { EnviadorFcm } from './enviador-fcm.js';
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
    find: vi.fn(),
  };
  const enviador = {
    chavePublica: 'chave-vapid' as string | null,
    enviar: vi.fn(),
  };
  const aparelhos = {
    upsert: vi.fn(),
    delete: vi.fn(),
    findBy: vi.fn(),
    find: vi.fn(),
  };
  const fcm = { ativo: false, enviar: vi.fn() };
  const service = new NotificacoesService(
    inscricoes as unknown as Repository<InscricaoPush>,
    enviador as unknown as EnviadorPush,
    aparelhos as unknown as Repository<AparelhoApp>,
    fcm as unknown as EnviadorFcm,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    enviador.chavePublica = 'chave-vapid';
    fcm.ativo = false;
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

  describe('aparelhos com o app Android', () => {
    const aparelhoDoJoao = { id: 5, usuarioId: 7, token: 'token-do-joao' };
    const aparelhoAntigo = { id: 6, usuarioId: 7, token: 'token-antigo' };

    beforeEach(() => {
      fcm.ativo = true;
      inscricoes.findBy.mockResolvedValue([]);
      inscricoes.find.mockResolvedValue([]);
    });

    it('registra o aparelho, transferindo-o se outro usuário entrou nele antes', async () => {
      await service.registrarAparelho(7, 'token-do-joao');

      expect(aparelhos.upsert).toHaveBeenCalledWith(
        { usuarioId: 7, token: 'token-do-joao' },
        ['token'],
      );
    });

    it('remove só o aparelho do próprio usuário', async () => {
      await service.removerAparelho(7, 'token-do-joao');

      expect(aparelhos.delete).toHaveBeenCalledWith({
        usuarioId: 7,
        token: 'token-do-joao',
      });
    });

    it('avisa o motorista também no app e apaga o aparelho que desinstalou', async () => {
      aparelhos.findBy.mockResolvedValue([aparelhoDoJoao, aparelhoAntigo]);
      fcm.enviar
        .mockResolvedValueOnce('ENVIADO')
        .mockResolvedValueOnce('EXPIRADO');

      await service.enviarParaUsuario(7, aviso);

      expect(aparelhos.findBy).toHaveBeenCalledWith({ usuarioId: 7 });
      expect(fcm.enviar).toHaveBeenCalledWith('token-do-joao', aviso);
      expect(aparelhos.delete).toHaveBeenCalledTimes(1);
      expect(aparelhos.delete).toHaveBeenCalledWith({ id: 6 });
    });

    it('convida todos os motoristas ativos também pelo app', async () => {
      aparelhos.find.mockResolvedValue([aparelhoDoJoao]);
      fcm.enviar.mockResolvedValue('ENVIADO');

      await service.enviarParaMotoristas(aviso);

      expect(aparelhos.find).toHaveBeenCalledWith({
        where: { usuario: { perfil: Perfil.MOTORISTA, ativo: true } },
      });
      expect(fcm.enviar).toHaveBeenCalledWith('token-do-joao', aviso);
    });

    it('não consulta os aparelhos quando o Firebase não está configurado', async () => {
      fcm.ativo = false;

      await service.enviarParaUsuario(7, aviso);

      expect(aparelhos.findBy).not.toHaveBeenCalled();
    });

    it('avisa pelo app mesmo se o envio pelo navegador falhar, e vice-versa', async () => {
      const registro = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      inscricoes.findBy.mockRejectedValue(new Error('banco fora do ar'));
      aparelhos.findBy.mockResolvedValue([aparelhoDoJoao]);
      fcm.enviar.mockResolvedValue('ENVIADO');

      await expect(
        service.enviarParaUsuario(7, aviso),
      ).resolves.toBeUndefined();

      expect(fcm.enviar).toHaveBeenCalledWith('token-do-joao', aviso);
      expect(registro).toHaveBeenCalledWith(
        expect.stringContaining('banco fora do ar'),
      );
      registro.mockRestore();
    });
  });

  describe('enviarParaMotoristas', () => {
    const daMaria = { ...notebook, id: 3, usuarioId: 8 };

    it('não faz nada quando o push não está configurado', async () => {
      enviador.chavePublica = null;

      await service.enviarParaMotoristas(aviso);

      expect(inscricoes.find).not.toHaveBeenCalled();
    });

    it('envia para os aparelhos de todos os motoristas ativos', async () => {
      inscricoes.find.mockResolvedValue([celular, daMaria]);
      enviador.enviar
        .mockResolvedValueOnce('ENVIADO')
        .mockResolvedValueOnce('EXPIRADO');

      await service.enviarParaMotoristas(aviso);

      expect(inscricoes.find).toHaveBeenCalledWith({
        where: { usuario: { perfil: Perfil.MOTORISTA, ativo: true } },
      });
      expect(enviador.enviar).toHaveBeenCalledWith(
        celular,
        JSON.stringify(aviso),
      );
      expect(enviador.enviar).toHaveBeenCalledWith(
        daMaria,
        JSON.stringify(aviso),
      );
      expect(inscricoes.delete).toHaveBeenCalledWith({ id: 3 });
    });

    it('nunca rejeita', async () => {
      const registro = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      inscricoes.find.mockRejectedValue(new Error('banco fora do ar'));

      await expect(
        service.enviarParaMotoristas(aviso),
      ).resolves.toBeUndefined();
      registro.mockRestore();
    });
  });
});
