import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Veiculo } from './veiculo.entity.js';
import { VeiculosService } from './veiculos.service.js';

const caminhao = {
  id: 1,
  placa: 'ABC1D23',
  modelo: 'VW Delivery',
  capacidadeKg: 5000,
  ativo: true,
};

function criarRepo() {
  return {
    find: vi.fn(),
    findOneBy: vi.fn(),
    existsBy: vi.fn().mockResolvedValue(false),
    create: vi.fn((dados: object) => dados),
    save: vi.fn(async (dados: object) => ({ id: 2, ativo: true, ...dados })),
    update: vi.fn(),
  };
}

describe('VeiculosService', () => {
  let repo: ReturnType<typeof criarRepo>;
  let service: VeiculosService;

  beforeEach(() => {
    repo = criarRepo();
    service = new VeiculosService(repo as unknown as Repository<Veiculo>);
  });

  describe('listar', () => {
    it('ordena pela placa e não filtra quando a situação não é informada', async () => {
      repo.find.mockResolvedValue([caminhao]);

      await expect(service.listar()).resolves.toEqual([caminhao]);
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { placa: 'ASC' },
      });
    });

    it('filtra pela situação quando informada', async () => {
      repo.find.mockResolvedValue([]);

      await service.listar(true);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ativo: true } }),
      );
    });
  });

  describe('buscar', () => {
    it('retorna o veículo encontrado', async () => {
      repo.findOneBy.mockResolvedValue(caminhao);

      await expect(service.buscar(1)).resolves.toBe(caminhao);
    });

    it('lança NotFound quando o veículo não existe', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.buscar(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('criar', () => {
    const dto = { placa: 'XYZ9A87', modelo: 'Ford Cargo', capacidadeKg: 8000 };

    it('persiste o veículo quando a placa está livre', async () => {
      await expect(service.criar(dto)).resolves.toMatchObject(dto);
      expect(repo.existsBy).toHaveBeenCalledWith({ placa: 'XYZ9A87' });
      expect(repo.save).toHaveBeenCalled();
    });

    it('recusa placa já cadastrada', async () => {
      repo.existsBy.mockResolvedValue(true);

      await expect(service.criar(dto)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    it('não consulta a placa quando ela não muda', async () => {
      repo.findOneBy.mockResolvedValue(caminhao);

      await service.atualizar(1, {
        placa: 'ABC1D23',
        modelo: 'VW Constellation',
      });

      expect(repo.existsBy).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(1, {
        placa: 'ABC1D23',
        modelo: 'VW Constellation',
      });
    });

    it('aceita a troca para uma placa livre', async () => {
      repo.findOneBy.mockResolvedValue(caminhao);

      await service.atualizar(1, { placa: 'NEW1A23' });

      expect(repo.existsBy).toHaveBeenCalledWith({ placa: 'NEW1A23' });
      expect(repo.update).toHaveBeenCalled();
    });

    it('recusa a troca para uma placa de outro veículo', async () => {
      repo.findOneBy.mockResolvedValue(caminhao);
      repo.existsBy.mockResolvedValue(true);

      await expect(service.atualizar(1, { placa: 'OUT1A23' })).rejects.toThrow(
        ConflictException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('lança NotFound quando o veículo não existe', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.atualizar(99, { modelo: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('desativar marca o veículo como inativo', async () => {
    repo.findOneBy.mockResolvedValue(caminhao);

    await service.desativar(1);

    expect(repo.update).toHaveBeenCalledWith(1, { ativo: false });
  });
});
