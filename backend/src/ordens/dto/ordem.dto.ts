import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsData } from '../../common/validacao.js';
import { StatusOrdem } from '../status-ordem.enum.js';

export class CriarOrdemDto {
  @IsInt()
  @IsPositive()
  clienteId: number;

  @IsInt()
  @IsPositive()
  veiculoId: number;

  @IsInt()
  @IsPositive()
  motoristaId: number;

  @IsData()
  dataColeta: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  enderecoColeta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;
}

export class AlterarStatusDto {
  @IsEnum(StatusOrdem, { message: 'status inválido' })
  status: StatusOrdem;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}

export class DataQueryDto {
  @IsOptional()
  @IsData()
  data?: string;
}

export class FiltroOrdensDto extends DataQueryDto {
  @IsOptional()
  @IsEnum(StatusOrdem, { message: 'status inválido' })
  status?: StatusOrdem;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  motoristaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;
}
