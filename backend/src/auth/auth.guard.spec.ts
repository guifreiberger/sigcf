import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { AuthGuard } from './auth.guard.js';
import { Perfis, Publico, UsuarioAtual } from './decorators.js';
import type { RequisicaoAutenticada } from './usuario-autenticado.js';

class RotasDeExemplo {
  @Publico()
  publica() {}

  autenticada() {}

  @Perfis(Perfil.GESTOR)
  soDoGestor() {}

  comUsuario(@UsuarioAtual() _usuario: unknown) {}
}

@Perfis(Perfil.MOTORISTA)
class ControladorDoMotorista {
  rota() {}
}

function contexto(
  handler: () => void,
  req: Partial<RequisicaoAutenticada>,
  classe: object = RotasDeExemplo,
) {
  return {
    getHandler: () => handler,
    getClass: () => classe,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const jwt = new JwtService({ secret: 'segredo-de-teste' });
  const usuarios = { findOne: vi.fn() };
  const guard = new AuthGuard(
    jwt,
    new Reflector(),
    usuarios as unknown as Repository<Usuario>,
  );
  const rotas = RotasDeExemplo.prototype;

  // O banco responde com o usuário ativo de mesmo perfil do token, salvo quando o teste muda.
  beforeEach(() => {
    usuarios.findOne.mockReset();
    usuarios.findOne.mockImplementation(async () => ({
      id: 7,
      nome: 'João',
      perfil: perfilNoBanco,
    }));
    perfilNoBanco = Perfil.MOTORISTA;
  });
  let perfilNoBanco = Perfil.MOTORISTA;

  const tokenDe = (perfil: Perfil) =>
    jwt.signAsync({ sub: 7, nome: 'João', perfil });
  const comToken = (token: string) => ({
    headers: { authorization: `Bearer ${token}` },
  });

  it('libera rotas públicas sem token e sem consultar o banco', async () => {
    await expect(
      guard.canActivate(contexto(rotas.publica, { headers: {} })),
    ).resolves.toBe(true);
    expect(usuarios.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ['sem o cabeçalho', {}],
    ['com outro esquema', { authorization: 'Basic dXNlcjpzZW5oYQ==' }],
    ['com Bearer vazio', { authorization: 'Bearer' }],
  ])('recusa requisição %s', async (_, headers) => {
    await expect(
      guard.canActivate(contexto(rotas.autenticada, { headers })),
    ).rejects.toThrow(new UnauthorizedException('Token de acesso ausente.'));
  });

  it('recusa token adulterado ou assinado com outro segredo', async () => {
    const falso = await new JwtService({ secret: 'outro' }).signAsync({
      sub: 1,
      nome: 'Intruso',
      perfil: Perfil.GESTOR,
    });

    await expect(
      guard.canActivate(contexto(rotas.autenticada, comToken(falso))),
    ).rejects.toThrow(new UnauthorizedException('Token inválido ou expirado.'));
    expect(usuarios.findOne).not.toHaveBeenCalled();
  });

  it('recusa na hora o token de um usuário desativado depois do login', async () => {
    usuarios.findOne.mockResolvedValue(null);
    const req = comToken(await tokenDe(Perfil.MOTORISTA));

    await expect(
      guard.canActivate(contexto(rotas.autenticada, req)),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Seu acesso foi desativado. Fale com o gestor.',
      ),
    );
    expect(usuarios.findOne).toHaveBeenCalledWith({
      where: { id: 7, ativo: true },
      select: { id: true, nome: true, perfil: true },
    });
  });

  it('decide as permissões pelo perfil atual do banco, não pelo que está no token', async () => {
    const req = comToken(await tokenDe(Perfil.GESTOR));

    await expect(
      guard.canActivate(contexto(rotas.soDoGestor, req)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('identifica o usuário do token na requisição', async () => {
    const req = comToken(
      await tokenDe(Perfil.MOTORISTA),
    ) as Partial<RequisicaoAutenticada>;

    await expect(
      guard.canActivate(contexto(rotas.autenticada, req)),
    ).resolves.toBe(true);
    expect(req.usuario).toEqual({
      id: 7,
      nome: 'João',
      perfil: Perfil.MOTORISTA,
    });
  });

  it('bloqueia o perfil sem permissão na rota', async () => {
    const req = comToken(await tokenDe(Perfil.MOTORISTA));

    await expect(
      guard.canActivate(contexto(rotas.soDoGestor, req)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('libera o perfil permitido na rota', async () => {
    perfilNoBanco = Perfil.GESTOR;
    const req = comToken(await tokenDe(Perfil.GESTOR));

    await expect(
      guard.canActivate(contexto(rotas.soDoGestor, req)),
    ).resolves.toBe(true);
  });

  it('aplica a restrição de perfil declarada no controlador inteiro', async () => {
    const rota = ControladorDoMotorista.prototype.rota;
    perfilNoBanco = Perfil.GESTOR;

    await expect(
      guard.canActivate(
        contexto(
          rota,
          comToken(await tokenDe(Perfil.GESTOR)),
          ControladorDoMotorista,
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
    perfilNoBanco = Perfil.MOTORISTA;
    await expect(
      guard.canActivate(
        contexto(
          rota,
          comToken(await tokenDe(Perfil.MOTORISTA)),
          ControladorDoMotorista,
        ),
      ),
    ).resolves.toBe(true);
  });
});

describe('@UsuarioAtual', () => {
  it('injeta o usuário que o guard anexou à requisição', () => {
    const argumentos = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      RotasDeExemplo,
      'comUsuario',
    ) as Record<
      string,
      { factory: (dado: unknown, ctx: ExecutionContext) => unknown }
    >;
    const { factory } = Object.values(argumentos)[0];
    const usuario = { id: 7, nome: 'João', perfil: Perfil.MOTORISTA };

    expect(
      factory(
        undefined,
        contexto(() => {}, { usuario }),
      ),
    ).toBe(usuario);
  });
});
