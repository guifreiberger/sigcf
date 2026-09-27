import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import {
  InscricaoPushDto,
  RemoverInscricaoDto,
} from './dto/inscricao-push.dto.js';
import { NotificacoesService } from './notificacoes.service.js';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  @Get('chave-publica')
  chavePublica() {
    return this.notificacoes.chavePublica();
  }

  @Post('inscricoes')
  @HttpCode(204)
  inscrever(
    @Body() dto: InscricaoPushDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.notificacoes.inscrever(usuario.id, dto);
  }

  @Delete('inscricoes')
  @HttpCode(204)
  remover(
    @Body() { endpoint }: RemoverInscricaoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.notificacoes.remover(usuario.id, endpoint);
  }
}
