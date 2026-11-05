import { hash } from 'bcryptjs';
import { isEmail } from 'class-validator';
import type { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { Usuario } from '../usuarios/usuario.entity.js';

export interface DadosDoGestor {
  nome: string;
  email: string;
  senha: string;
}

const TAMANHO_MINIMO_DA_SENHA = 8;

// Em produção não há seed: o primeiro gestor é criado por este script, com dados informados
// na hora pelo responsável, e a partir dele os demais cadastros são feitos pela aplicação.
export function lerDadosDoGestor(
  ambiente: NodeJS.ProcessEnv = process.env,
): DadosDoGestor {
  const nome = ambiente.GESTOR_NOME?.trim();
  const email = ambiente.GESTOR_EMAIL?.trim().toLowerCase();
  const senha = ambiente.GESTOR_SENHA ?? '';
  if (!nome) throw new Error('Informe GESTOR_NOME.');
  if (!email || !isEmail(email)) {
    throw new Error('Informe um e-mail válido em GESTOR_EMAIL.');
  }
  if (senha.length < TAMANHO_MINIMO_DA_SENHA) {
    throw new Error(
      `GESTOR_SENHA precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`,
    );
  }
  return { nome, email, senha };
}

export async function criarGestor(
  usuarios: Repository<Usuario>,
  { nome, email, senha }: DadosDoGestor,
): Promise<'criado' | 'existente'> {
  if (await usuarios.existsBy({ email })) return 'existente';
  await usuarios.save({
    nome,
    email,
    perfil: Perfil.GESTOR,
    senhaHash: await hash(senha, 10),
  });
  return 'criado';
}
