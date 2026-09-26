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
import { AtualizarVeiculoDto, CriarVeiculoDto } from './dto/veiculo.dto.js';
import { VeiculosService } from './veiculos.service.js';

@Controller('veiculos')
@Perfis(Perfil.GESTOR)
export class VeiculosController {
  constructor(private readonly veiculos: VeiculosService) {}

  @Get()
  listar(@Query() { ativo }: AtivoQueryDto) {
    return this.veiculos.listar(ativo);
  }

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.veiculos.buscar(id);
  }

  @Post()
  criar(@Body() dto: CriarVeiculoDto) {
    return this.veiculos.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarVeiculoDto,
  ) {
    return this.veiculos.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.veiculos.desativar(id);
  }
}
