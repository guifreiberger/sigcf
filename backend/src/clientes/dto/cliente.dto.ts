import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsTelefone } from '../../common/validacao.js';

export class CriarClienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @IsOptional()
  @IsTelefone()
  telefone?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  endereco: string;
}

export class AtualizarClienteDto extends PartialType(CriarClienteDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
