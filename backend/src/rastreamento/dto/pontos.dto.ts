import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsISO8601,
  ValidateNested,
} from 'class-validator';
import { LocalizacaoDto } from '../../ordens/dto/ordem.dto.js';

export class PontoGpsDto extends LocalizacaoDto {
  @IsISO8601(
    { strict: true },
    { message: 'registradoEm não é uma data válida' },
  )
  registradoEm: string;
}

// O celular envia as leituras em lotes; o limite cobre quase uma hora sem sinal.
export class RegistrarPontosDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'envie ao menos um ponto' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PontoGpsDto)
  pontos: PontoGpsDto[];
}
