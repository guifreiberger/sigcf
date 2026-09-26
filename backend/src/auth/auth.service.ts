import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import type { PayloadJwt, UsuarioAutenticado } from './usuario-autenticado.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario = await this.usuarios
      .createQueryBuilder('u')
      .addSelect('u.senhaHash')
      .where('u.email = :email', { email })
      .getOne();

    const valido =
      usuario?.ativo === true && (await compare(senha, usuario.senhaHash));
    if (!usuario || !valido) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const payload: PayloadJwt = {
      sub: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  }

  async perfil(usuario: UsuarioAutenticado) {
    const encontrado = await this.usuarios.findOneBy({
      id: usuario.id,
      ativo: true,
    });
    if (!encontrado) throw new UnauthorizedException('Usuário inativo.');
    return encontrado;
  }
}
