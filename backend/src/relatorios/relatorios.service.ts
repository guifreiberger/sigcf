import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type FindOptionsWhere, Repository } from 'typeorm';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { FiltroRelatorioDto, PeriodoDto } from './dto/periodo.dto.js';
import {
  diasEntre,
  linhaDoRelatorio,
  resumirDashboard,
} from './indicadores.js';

// Um ano cobre a comparação mensal do dashboard e mantém as consultas limitadas.
const MAXIMO_DE_DIAS = 366;

@Injectable()
export class RelatoriosService {
  constructor(
    @InjectRepository(OrdemColeta)
    private readonly ordens: Repository<OrdemColeta>,
  ) {}

  async dashboard({ de, ate }: PeriodoDto) {
    this.validarPeriodo(de, ate);
    const ordens = await this.ordens.find({
      where: { dataColeta: Between(de, ate) },
      relations: { cliente: true, motorista: true },
    });
    return resumirDashboard(ordens, de, ate);
  }

  async coletas({
    de,
    ate,
    motoristaId,
    clienteId,
    status,
  }: FiltroRelatorioDto) {
    this.validarPeriodo(de, ate);
    const where: FindOptionsWhere<OrdemColeta> = {
      dataColeta: Between(de, ate),
    };
    if (motoristaId) where.motoristaId = motoristaId;
    if (clienteId) where.clienteId = clienteId;
    if (status) where.status = status;

    const ordens = await this.ordens.find({
      where,
      relations: {
        cliente: true,
        motorista: true,
        veiculo: true,
        historico: true,
      },
      order: { dataColeta: 'ASC', id: 'ASC', historico: { id: 'ASC' } },
    });
    return ordens.map(linhaDoRelatorio);
  }

  private validarPeriodo(de: string, ate: string) {
    if (ate < de) {
      throw new BadRequestException(
        'A data final deve ser igual ou posterior à inicial.',
      );
    }
    if (diasEntre(de, ate) > MAXIMO_DE_DIAS) {
      throw new BadRequestException('Escolha um período de até um ano.');
    }
  }
}
