import { IsBoolean, IsOptional } from 'class-validator';
import { ParaBooleano } from './validacao.js';

export class AtivoQueryDto {
  @IsOptional()
  @ParaBooleano()
  @IsBoolean()
  ativo?: boolean;
}
