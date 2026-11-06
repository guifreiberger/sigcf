import { Controller, Get, Query } from '@nestjs/common';
import { Perfis } from '../auth/decorators.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { FiltroRelatorioDto, PeriodoDto } from './dto/periodo.dto.js';
import { RelatoriosService } from './relatorios.service.js';

@Controller('relatorios')
@Perfis(Perfil.GESTOR)
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('dashboard')
  dashboard(@Query() periodo: PeriodoDto) {
    return this.relatorios.dashboard(periodo);
  }

  @Get('coletas')
  coletas(@Query() filtro: FiltroRelatorioDto) {
    return this.relatorios.coletas(filtro);
  }
}
