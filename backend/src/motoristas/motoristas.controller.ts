import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Perfis } from '../auth/decorators.js';
import { AtivoQueryDto } from '../common/ativo-query.dto.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import {
  AtualizarMotoristaDto,
  CriarMotoristaDto,
} from './dto/motorista.dto.js';
import { MotoristasService } from './motoristas.service.js';

@Controller('motoristas')
@Perfis(Perfil.GESTOR)
export class MotoristasController {
  constructor(private readonly motoristas: MotoristasService) {}

  @Get()
  listar(@Query() { ativo }: AtivoQueryDto) {
    return this.motoristas.listar(ativo);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.motoristas.buscar(id);
  }

  @Post()
  criar(@Body() dto: CriarMotoristaDto) {
    return this.motoristas.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarMotoristaDto,
  ) {
    return this.motoristas.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.motoristas.desativar(id);
  }
}
