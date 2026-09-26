import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

export class CriarVeiculoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.replace(/[\s-]/g, '').toUpperCase()
      : value,
  )
  @Matches(/^[A-Z]{3}\d[A-Z0-9]\d{2}$/, {
    message: 'placa inválida (use o formato AAA1234 ou Mercosul AAA1A23)',
  })
  placa: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  modelo: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99_999_999)
  capacidadeKg: number;
}

export class AtualizarVeiculoDto extends PartialType(CriarVeiculoDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
