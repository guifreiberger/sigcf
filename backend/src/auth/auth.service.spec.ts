import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import type { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { AuthService } from './auth.service.js';

const gestor = {
  id: 1,
  nome: 'Ana',
  email: 'gestor@sigcf.local',
  perfil: Perfil.GESTOR,
  ativo: true,
  senhaHash: hashSync('senha-correta', 4),
};

describe('AuthService', () => {
  const consulta = {
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
  };
  const repo = {
    createQueryBuilder: vi.fn(() => consulta),
    findOneBy: vi.fn(),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('token-assinado') };
  const service = new AuthService(
    repo as unknown as Repository<Usuario>,
    jwt as unknown as JwtService,
  );

  beforeEach(() => vi.clearAllMocks());

  describe('login', () => {
    it('emite o token com id, nome e perfil e não devolve o hash da senha', async () => {
      consulta.getOne.mockResolvedValue(gestor);

      const resposta = await service.login(gestor.email, 'senha-correta');

      expect(consulta.addSelect).toHaveBeenCalledWith('u.senhaHash');
      expect(consulta.where).toHaveBeenCalledWith('u.email = :email', {
        email: gestor.email,
      });
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 1,
        nome: 'Ana',
        perfil: Perfil.GESTOR,
      });
      expect(resposta).toEqual({
        accessToken: 'token-assinado',
        usuario: {
          id: 1,
          nome: 'Ana',
          email: gestor.email,
          perfil: Perfil.GESTOR,
        },
      });
    });

    it.each([
      ['e-mail não cadastrado', null, 'senha-correta'],
      ['senha incorreta', gestor, 'senha-errada'],
      ['usuário desativado', { ...gestor, ativo: false }, 'senha-correta'],
    ])('recusa %s com a mesma mensagem genérica', async (_, usuario, senha) => {
      consulta.getOne.mockResolvedValue(usuario);

      await expect(service.login(gestor.email, senha)).rejects.toThrow(
        new UnauthorizedException('E-mail ou senha inválidos.'),
      );
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('perfil', () => {
    const autenticado = { id: 1, nome: 'Ana', perfil: Perfil.GESTOR };

    it('devolve o usuário ativo do token', async () => {
      repo.findOneBy.mockResolvedValue(gestor);

      await expect(service.perfil(autenticado)).resolves.toBe(gestor);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1, ativo: true });
    });

    it('recusa token de usuário desativado depois do login', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.perfil(autenticado)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
