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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsData } from '../../common/validacao.js';
import { StatusOrdem } from '../status-ordem.enum.js';

export class CriarOrdemDto {
  @IsInt()
  @IsPositive()
  clienteId: number;

  // Sem motorista e veículo, a coleta é publicada para os motoristas (RF12).
  @IsOptional()
  @IsInt()
  @IsPositive()
  veiculoId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  motoristaId?: number;

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

// Só os campos enviados são alterados. Nulo tira o motorista e o caminhão (a coleta volta a
// ficar disponível), o peso estimado ou as observações; cliente, endereço e data não podem ser apagados.
export class EditarOrdemDto {
  @ValidateIf((o: EditarOrdemDto) => o.clienteId !== undefined)
  @IsInt()
  @IsPositive()
  clienteId?: number;

  @ValidateIf((o: EditarOrdemDto) => o.enderecoColeta !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  enderecoColeta?: string;

  @ValidateIf((o: EditarOrdemDto) => o.dataColeta !== undefined)
  @IsData()
  dataColeta?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'peso estimado inválido' })
  @IsPositive({ message: 'peso estimado deve ser maior que zero' })
  @Max(99_999_999, { message: 'peso estimado inválido' })
  pesoEstimadoKg?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  motoristaId?: number | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  veiculoId?: number | null;
}

export class RegistrarPesoDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'peso da balança inválido' })
  @IsPositive({ message: 'peso da balança deve ser maior que zero' })
  @Max(99_999_999, { message: 'peso da balança inválido' })
  pesoRealKg: number;
}

export class AceitarColetaDto {
  @IsInt()
  @IsPositive()
  veiculoId: number;
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
