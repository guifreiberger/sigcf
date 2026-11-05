import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
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
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'peso estimado inválido' })
  @IsPositive({ message: 'peso estimado deve ser maior que zero' })
  @Max(99_999_999, { message: 'peso estimado inválido' })
  pesoEstimadoKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string;
}

export class LocalizacaoDto {
  @IsNumber({}, { message: 'latitude inválida' })
  @Min(-90, { message: 'latitude inválida' })
  @Max(90, { message: 'latitude inválida' })
  latitude: number;

  @IsNumber({}, { message: 'longitude inválida' })
  @Min(-180, { message: 'longitude inválida' })
  @Max(180, { message: 'longitude inválida' })
  longitude: number;

  @IsOptional()
  @IsNumber({}, { message: 'precisão inválida' })
  @Min(0, { message: 'precisão inválida' })
  @Max(100_000, { message: 'precisão inválida' })
  precisaoMetros?: number;
}

export class AlterarStatusDto {
  @IsEnum(StatusOrdem, { message: 'status inválido' })
  status: StatusOrdem;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizacaoDto)
  localizacao?: LocalizacaoDto;
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
