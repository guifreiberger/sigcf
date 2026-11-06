import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { compare } from 'bcryptjs';
import type { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { Veiculo } from '../veiculos/veiculo.entity.js';
import { MotoristasService } from './motoristas.service.js';

const joao = {
  id: 7,
  nome: 'João',
  email: 'joao@sigcf.local',
  telefone: '47999990000',
  perfil: Perfil.MOTORISTA,
  ativo: true,
};

function criarRepo() {
  return {
    find: vi.fn(),
    findOneBy: vi.fn(),
    existsBy: vi.fn().mockResolvedValue(false),
    create: vi.fn((dados: object) => dados),
    save: vi.fn(async (dados: object) => ({ id: 7, ...dados })),
    update: vi.fn(),
  };
}

describe('MotoristasService', () => {
  let repo: ReturnType<typeof criarRepo>;
  let service: MotoristasService;
  const veiculos = { existsBy: vi.fn() };

  beforeEach(() => {
    repo = criarRepo();
    veiculos.existsBy.mockReset().mockResolvedValue(true);
    service = new MotoristasService(
      repo as unknown as Repository<Usuario>,
      veiculos as unknown as Repository<Veiculo>,
    );
  });

  describe('caminhão padrão (RF14)', () => {
    const novo = {
      nome: 'João',
      email: 'joao@sigcf.local',
      senha: 'segredo1',
      telefone: '47999990000',
    };

    it('guarda o caminhão padrão do motorista, se ele estiver ativo', async () => {
      repo.findOneBy.mockResolvedValue(joao);

      await service.criar({ ...novo, veiculoPadraoId: 4 });

      expect(veiculos.existsBy).toHaveBeenCalledWith({ id: 4, ativo: true });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ veiculoPadraoId: 4 }),
      );
    });

    it('recusa caminhão padrão inexistente ou inativo', async () => {
      veiculos.existsBy.mockResolvedValue(false);
      repo.findOneBy.mockResolvedValue(joao);

      await expect(
        service.atualizar(7, { veiculoPadraoId: 99 }),
      ).rejects.toThrow(
        new UnprocessableEntityException('Caminhão não encontrado ou inativo.'),
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('tira o caminhão padrão com nulo, sem consultar a frota', async () => {
      repo.findOneBy.mockResolvedValue(joao);

      await service.atualizar(7, { veiculoPadraoId: null });

      expect(veiculos.existsBy).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(7, { veiculoPadraoId: null });
    });
  });

  describe('listar', () => {
    it('lista apenas usuários com perfil de motorista', async () => {
      repo.find.mockResolvedValue([joao]);

      await expect(service.listar()).resolves.toEqual([joao]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { perfil: Perfil.MOTORISTA },
        order: { nome: 'ASC' },
      });
    });

    it('combina o perfil com o filtro de situação', async () => {
      repo.find.mockResolvedValue([]);

      await service.listar(false);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { perfil: Perfil.MOTORISTA, ativo: false },
        }),
      );
    });
  });

  describe('buscar', () => {
    it('não encontra usuários de outro perfil', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.buscar(1)).rejects.toThrow(NotFoundException);
      expect(repo.findOneBy).toHaveBeenCalledWith({
        id: 1,
        perfil: Perfil.MOTORISTA,
      });
    });
  });

  describe('criar', () => {
    const dto = {
      nome: 'Pedro',
      email: 'pedro@sigcf.local',
      senha: 'senha-forte',
      telefone: '47988880000',
    };

    it('guarda apenas o hash da senha e força o perfil de motorista', async () => {
      repo.findOneBy.mockResolvedValue(joao);

      await service.criar(dto);

      const salvo = repo.save.mock.calls[0][0] as Record<string, unknown>;
      expect(salvo).not.toHaveProperty('senha');
      expect(salvo.perfil).toBe(Perfil.MOTORISTA);
      expect(await compare('senha-forte', salvo.senhaHash as string)).toBe(
        true,
      );
    });

    it('devolve o motorista recarregado do banco', async () => {
      repo.findOneBy.mockResolvedValue(joao);

      await expect(service.criar(dto)).resolves.toBe(joao);
      expect(repo.findOneBy).toHaveBeenCalledWith({
        id: 7,
        perfil: Perfil.MOTORISTA,
      });
    });

    it('recusa e-mail já utilizado por outro usuário', async () => {
      repo.existsBy.mockResolvedValue(true);

      await expect(service.criar(dto)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    beforeEach(() => repo.findOneBy.mockResolvedValue(joao));

    it('troca a senha gravando um novo hash', async () => {
      await service.atualizar(7, { senha: 'nova-senha' });

      const [, alteracoes] = repo.update.mock.calls[0] as [
        number,
        Record<string, unknown>,
      ];
      expect(alteracoes).not.toHaveProperty('senha');
      expect(await compare('nova-senha', alteracoes.senhaHash as string)).toBe(
        true,
      );
    });

    it('mantém a senha quando ela não é informada', async () => {
      await service.atualizar(7, { telefone: '47977770000' });

      expect(repo.update).toHaveBeenCalledWith(7, { telefone: '47977770000' });
    });

    it('só verifica o e-mail quando ele muda', async () => {
      await service.atualizar(7, { email: joao.email });
      expect(repo.existsBy).not.toHaveBeenCalled();

      await service.atualizar(7, { email: 'novo@sigcf.local' });
      expect(repo.existsBy).toHaveBeenCalledWith({ email: 'novo@sigcf.local' });
    });

    it('recusa a troca para um e-mail já utilizado', async () => {
      repo.existsBy.mockResolvedValue(true);

      await expect(
        service.atualizar(7, { email: 'gestor@sigcf.local' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  it('desativar marca o motorista como inativo', async () => {
    repo.findOneBy.mockResolvedValue(joao);

    await service.desativar(7);

    expect(repo.update).toHaveBeenCalledWith(7, { ativo: false });
  });
});
