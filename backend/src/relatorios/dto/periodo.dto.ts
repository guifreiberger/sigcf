import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { IsData } from '../../common/validacao.js';
import { StatusOrdem } from '../../ordens/status-ordem.enum.js';

export class PeriodoDto {
  @IsData()
  de: string;

  @IsData()
  ate: string;
}

export class FiltroRelatorioDto extends PeriodoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  motoristaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @IsEnum(StatusOrdem, { message: 'status inválido' })
  status?: StatusOrdem;
}
