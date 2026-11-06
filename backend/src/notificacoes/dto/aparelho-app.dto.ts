import { IsString, Matches, MaxLength } from 'class-validator';

export class AparelhoAppDto {
  // Tokens do Firebase usam só letras, números, hífen, sublinhado e dois-pontos.
  @IsString()
  @Matches(/^[\w:-]+$/, { message: 'token do aparelho inválido' })
  @MaxLength(500)
  token: string;
}
