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
import { ClientesService } from './clientes.service.js';
import { AtualizarClienteDto, CriarClienteDto } from './dto/cliente.dto.js';

@Controller('clientes')
@Perfis(Perfil.GESTOR)
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  listar(@Query() { ativo }: AtivoQueryDto) {
    return this.clientes.listar(ativo);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.clientes.buscar(id);
  }

  @Post()
  criar(@Body() dto: CriarClienteDto) {
    return this.clientes.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarClienteDto,
  ) {
    return this.clientes.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.clientes.desativar(id);
  }
}
