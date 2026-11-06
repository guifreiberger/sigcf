import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  AceitarColetaDto,
  AlterarStatusDto,
  CriarOrdemDto,
  EditarOrdemDto,
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

  @Get('disponiveis')
  @Perfis(Perfil.MOTORISTA)
  disponiveis() {
    return this.ordens.disponiveis();
  }

  @Post(':id/aceitar')
  @HttpCode(200)
  @Perfis(Perfil.MOTORISTA)
  aceitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AceitarColetaDto,
    @UsuarioAtual() motorista: UsuarioAutenticado,
  ) {
    return this.ordens.aceitar(id, dto, motorista);
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

  @Patch(':id')
  @Perfis(Perfil.GESTOR)
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarOrdemDto,
    @UsuarioAtual() gestor: UsuarioAutenticado,
  ) {
    return this.ordens.editar(id, dto, gestor);
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
