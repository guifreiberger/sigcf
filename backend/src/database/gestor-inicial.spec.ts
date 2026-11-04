import { compare } from 'bcryptjs';
import type { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { criarGestor, lerDadosDoGestor } from './gestor-inicial.js';

const dados = {
  nome: 'Carlos Menezes',
  email: 'carlos@edepel.com.br',
  senha: 'uma-senha-longa',
};

describe('gestor inicial', () => {
  describe('lerDadosDoGestor', () => {
    it('lê nome, e-mail e senha das variáveis de ambiente', () => {
      expect(
        lerDadosDoGestor({
          GESTOR_NOME: ' Carlos Menezes ',
          GESTOR_EMAIL: ' Carlos@Edepel.com.br ',
          GESTOR_SENHA: 'uma-senha-longa',
        }),
      ).toEqual(dados);
    });

    it.each([
      ['sem nome', { GESTOR_EMAIL: 'a@b.com', GESTOR_SENHA: '12345678' }],
      ['sem e-mail', { GESTOR_NOME: 'Ana', GESTOR_SENHA: '12345678' }],
      [
        'com e-mail inválido',
        { GESTOR_NOME: 'Ana', GESTOR_EMAIL: 'ana', GESTOR_SENHA: '12345678' },
      ],
      [
        'com senha curta',
        { GESTOR_NOME: 'Ana', GESTOR_EMAIL: 'a@b.com', GESTOR_SENHA: '1234' },
      ],
    ])('recusa dados %s', (_, ambiente) => {
      expect(() => lerDadosDoGestor(ambiente)).toThrow(/GESTOR_/);
    });
  });

  describe('criarGestor', () => {
    const repo = {
      existsBy: vi.fn(),
      save: vi.fn(),
    };
    const usuarios = repo as unknown as Repository<Usuario>;

    beforeEach(() => vi.clearAllMocks());

    it('cria o gestor com a senha protegida por hash', async () => {
      repo.existsBy.mockResolvedValue(false);

      await expect(criarGestor(usuarios, dados)).resolves.toBe('criado');

      const salvo = repo.save.mock.calls[0][0] as Record<string, unknown>;
      expect(salvo).toMatchObject({
        nome: 'Carlos Menezes',
        email: 'carlos@edepel.com.br',
        perfil: Perfil.GESTOR,
      });
      expect(salvo).not.toHaveProperty('senha');
      expect(await compare('uma-senha-longa', salvo.senhaHash as string)).toBe(
        true,
      );
    });

    it('não duplica nem altera um usuário que já existe', async () => {
      repo.existsBy.mockResolvedValue(true);

      await expect(criarGestor(usuarios, dados)).resolves.toBe('existente');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
