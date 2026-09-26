import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Perfil } from '../usuarios/perfil.enum.js';
import { CHAVE_PERFIS, CHAVE_PUBLICO } from './decorators.js';
import type {
  PayloadJwt,
  RequisicaoAutenticada,
} from './usuario-autenticado.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, alvos)) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    let payload: PayloadJwt;
    try {
      payload = await this.jwt.verifyAsync<PayloadJwt>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
    req.usuario = {
      id: payload.sub,
      nome: payload.nome,
      perfil: payload.perfil,
    };

    const perfis = this.reflector.getAllAndOverride<Perfil[] | undefined>(
      CHAVE_PERFIS,
      alvos,
    );
    if (perfis && !perfis.includes(payload.perfil)) {
      throw new ForbiddenException(
        'Seu perfil não tem permissão para esta ação.',
      );
    }
    return true;
  }
}
