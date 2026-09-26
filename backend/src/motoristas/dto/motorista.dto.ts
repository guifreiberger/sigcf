import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  IsCnh,
  IsEmailNormalizado,
  IsTelefone,
} from '../../common/validacao.js';

export class CriarMotoristaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @IsEmailNormalizado()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  senha: string;

  @IsTelefone()
  telefone: string;

  @IsOptional()
  @IsCnh()
  cnh?: string | null;
}

export class AtualizarMotoristaDto extends PartialType(
  OmitType(CriarMotoristaDto, ['senha'] as const),
) {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  senha?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
