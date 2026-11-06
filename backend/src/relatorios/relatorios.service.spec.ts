import { BadRequestException } from '@nestjs/common';
import { Between, type Repository } from 'typeorm';
import type { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import { RelatoriosService } from './relatorios.service.js';

describe('RelatoriosService', () => {
  const ordens = { find: vi.fn() };
  const service = new RelatoriosService(
    ordens as unknown as Repository<OrdemColeta>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    ordens.find.mockResolvedValue([]);
  });

  it('resume no dashboard as ordens do período, com cliente e motorista', async () => {
    const resumo = await service.dashboard({
      de: '2026-11-01',
      ate: '2026-11-30',
    });

    expect(ordens.find).toHaveBeenCalledWith({
      where: { dataColeta: Between('2026-11-01', '2026-11-30') },
      relations: { cliente: true, motorista: true },
    });
    expect(resumo).toMatchObject({
      de: '2026-11-01',
      ate: '2026-11-30',
      agrupamento: 'dia',
    });
  });

  it('filtra o relatório por motorista, cliente e status, com o histórico em ordem', async () => {
    await service.coletas({
      de: '2026-11-01',
      ate: '2026-11-30',
      motoristaId: 7,
      clienteId: 3,
      status: StatusOrdem.CONCLUIDA,
    });

    expect(ordens.find).toHaveBeenCalledWith({
      where: {
        dataColeta: Between('2026-11-01', '2026-11-30'),
        motoristaId: 7,
        clienteId: 3,
        status: StatusOrdem.CONCLUIDA,
      },
      relations: {
        cliente: true,
        motorista: true,
        veiculo: true,
        historico: true,
      },
      order: { dataColeta: 'ASC', id: 'ASC', historico: { id: 'ASC' } },
    });
  });

  it.each([
    [
      'com o fim antes do início',
      '2026-11-30',
      '2026-11-01',
      'A data final deve ser igual ou posterior à inicial.',
    ],
    [
      'maior que um ano',
      '2025-01-01',
      '2026-11-30',
      'Escolha um período de até um ano.',
    ],
  ])('recusa período %s', async (_, de, ate, mensagem) => {
    await expect(service.dashboard({ de, ate })).rejects.toThrow(
      new BadRequestException(mensagem),
    );
    await expect(service.coletas({ de, ate })).rejects.toThrow(
      BadRequestException,
    );
    expect(ordens.find).not.toHaveBeenCalled();
  });
});
