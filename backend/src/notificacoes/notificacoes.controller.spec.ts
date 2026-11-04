import { Perfil } from '../usuarios/perfil.enum.js';
import { NotificacoesController } from './notificacoes.controller.js';
import type { NotificacoesService } from './notificacoes.service.js';

describe('NotificacoesController', () => {
  const service = {
    chavePublica: vi.fn().mockReturnValue({ chavePublica: 'chave' }),
    inscrever: vi.fn(),
    remover: vi.fn(),
  };
  const controller = new NotificacoesController(
    service as unknown as NotificacoesService,
  );
  const joao = { id: 7, nome: 'João', perfil: Perfil.MOTORISTA };
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc';

  it('devolve a chave pública', () => {
    expect(controller.chavePublica()).toEqual({ chavePublica: 'chave' });
  });

  it('inscreve e remove sempre em nome do usuário autenticado', async () => {
    const dto = { endpoint, keys: { p256dh: 'p', auth: 'a' } };

    await controller.inscrever(dto, joao);
    await controller.remover({ endpoint }, joao);

    expect(service.inscrever).toHaveBeenCalledWith(7, dto);
    expect(service.remover).toHaveBeenCalledWith(7, endpoint);
  });
});
