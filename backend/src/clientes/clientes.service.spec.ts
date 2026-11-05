import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Cliente } from './cliente.entity.js';
import { ClientesService } from './clientes.service.js';

const weg = { id: 1, nome: 'WEG', endereco: 'Rua A, 100', ativo: true };

function criarRepo() {
  return {
    find: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((dados: object) => dados),
    save: vi.fn(async (dados: object) => ({ id: 2, ativo: true, ...dados })),
    update: vi.fn(),
  };
}

describe('ClientesService', () => {
  let repo: ReturnType<typeof criarRepo>;
  let service: ClientesService;

  beforeEach(() => {
    repo = criarRepo();
    service = new ClientesService(repo as unknown as Repository<Cliente>);
  });

  describe('listar', () => {
    it('lista todos em ordem alfabética quando o filtro não é informado', async () => {
      repo.find.mockResolvedValue([weg]);

      await expect(service.listar()).resolves.toEqual([weg]);
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { nome: 'ASC' },
      });
    });

    it('filtra pela situação quando informada', async () => {
      repo.find.mockResolvedValue([]);

      await service.listar(false);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ativo: false } }),
      );
    });
  });

  describe('buscar', () => {
    it('retorna o cliente encontrado', async () => {
      repo.findOneBy.mockResolvedValue(weg);

      await expect(service.buscar(1)).resolves.toBe(weg);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('lança NotFound quando o cliente não existe', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.buscar(99)).rejects.toThrow(NotFoundException);
    });
  });

  it('criar persiste os dados recebidos', async () => {
    const dto = { nome: 'Malwee', endereco: 'Rua B, 200' };

    await expect(service.criar(dto)).resolves.toMatchObject({ id: 2, ...dto });
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(dto);
  });

  describe('atualizar', () => {
    it('aplica as alterações e devolve o cliente recarregado', async () => {
      const atualizado = { ...weg, telefone: '47999990000' };
      repo.findOneBy
        .mockResolvedValueOnce(weg)
        .mockResolvedValueOnce(atualizado);

      await expect(
        service.atualizar(1, { telefone: '47999990000' }),
      ).resolves.toBe(atualizado);
      expect(repo.update).toHaveBeenCalledWith(1, { telefone: '47999990000' });
    });

    it('não altera nada quando o cliente não existe', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.atualizar(99, { nome: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('desativar', () => {
    it('marca o cliente como inativo, sem excluir o registro', async () => {
      repo.findOneBy.mockResolvedValue(weg);

      await service.desativar(1);

      expect(repo.update).toHaveBeenCalledWith(1, { ativo: false });
    });

    it('lança NotFound quando o cliente não existe', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.desativar(99)).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
