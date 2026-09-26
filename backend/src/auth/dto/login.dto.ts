import { IsNotEmpty, IsString } from 'class-validator';
import { IsEmailNormalizado } from '../../common/validacao.js';

export class LoginDto {
  @IsEmailNormalizado()
  email: string;

  @IsString()
  @IsNotEmpty()
  senha: string;
}
