import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import {
  AlterarStatusDto,
  CriarOrdemDto,
  DataQueryDto,
  FiltroOrdensDto,
} from './dto/ordem.dto.js';
import { OrdensService } from './ordens.service.js';

@Controller('ordens')
export class OrdensController {
  constructor(private readonly ordens: OrdensService) {}

  @Post()
  @Perfis(Perfil.GESTOR)
  criar(
    @Body() dto: CriarOrdemDto,
    @UsuarioAtual() gestor: UsuarioAutenticado,
  ) {
    return this.ordens.criar(dto, gestor);
  }

  @Get()
  @Perfis(Perfil.GESTOR)
  listar(
    @Query() filtros: FiltroOrdensDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.ordens.listar(filtros, usuario);
  }

  @Get('minhas')
  @Perfis(Perfil.MOTORISTA)
  minhas(
    @Query() { data }: DataQueryDto,
    @UsuarioAtual() motorista: UsuarioAutenticado,
  ) {
    return this.ordens.minhas(motorista, data);
  }

  @Get('resumo')
  @Perfis(Perfil.GESTOR)
  resumo(@Query() { data }: DataQueryDto) {
    return this.ordens.resumo(data);
  }

  @Get(':id')
  detalhar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.ordens.detalhar(id, usuario);
  }

  @Patch(':id/status')
  alterarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlterarStatusDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.ordens.alterarStatus(id, dto, usuario);
  }
}
