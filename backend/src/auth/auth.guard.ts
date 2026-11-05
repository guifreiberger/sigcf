import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import { Usuario } from '../usuarios/usuario.entity.js';
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
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
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
    // O token só prova quem é. Consultar o banco corta na hora o acesso de quem foi
    // desativado e faz valer o perfil atual, sem esperar o token expirar.
    const usuario = await this.usuarios.findOne({
      where: { id: payload.sub, ativo: true },
      select: { id: true, nome: true, perfil: true },
    });
    if (!usuario) {
      throw new UnauthorizedException(
        'Seu acesso foi desativado. Fale com o gestor.',
      );
    }
    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
    };

    const perfis = this.reflector.getAllAndOverride<Perfil[] | undefined>(
      CHAVE_PERFIS,
      alvos,
    );
    if (perfis && !perfis.includes(usuario.perfil)) {
      throw new ForbiddenException(
        'Seu perfil não tem permissão para esta ação.',
      );
    }
    return true;
  }
}
