import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Publico, UsuarioAtual } from './decorators.js';
import { LoginDto } from './dto/login.dto.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Publico()
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.senha);
  }

  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.auth.perfil(usuario);
  }
}
