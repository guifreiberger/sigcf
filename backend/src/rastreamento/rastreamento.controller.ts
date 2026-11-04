import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { RegistrarPontosDto } from './dto/pontos.dto.js';
import { RastreamentoService } from './rastreamento.service.js';

@Controller('rastreamento')
export class RastreamentoController {
  constructor(private readonly rastreamento: RastreamentoService) {}

  @Post('pontos')
  @Perfis(Perfil.MOTORISTA)
  @HttpCode(204)
  registrar(
    @Body() dto: RegistrarPontosDto,
    @UsuarioAtual() motorista: UsuarioAutenticado,
  ) {
    return this.rastreamento.registrar(motorista, dto);
  }

  @Get('em-rota')
  @Perfis(Perfil.GESTOR)
  emRota() {
    return this.rastreamento.emRota();
  }

  @Get('ordens/:id')
  @Perfis(Perfil.GESTOR)
  trajeto(@Param('id', ParseIntPipe) id: number) {
    return this.rastreamento.trajeto(id);
  }
}
