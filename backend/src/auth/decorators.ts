import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { RequisicaoAutenticada } from './usuario-autenticado.js';

export const CHAVE_PUBLICO = 'publico';
export const CHAVE_PERFIS = 'perfis';

export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);

export const Perfis = (...perfis: Perfil[]) =>
  SetMetadata(CHAVE_PERFIS, perfis);

export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<RequisicaoAutenticada>().usuario,
);
