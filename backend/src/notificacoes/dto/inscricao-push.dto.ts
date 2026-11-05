import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Só serviços de push dos navegadores: impede que o servidor seja usado para
// enviar requisições a endereços arbitrários (SSRF).
export const SERVICOS_DE_PUSH = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

export class ChavesPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  auth: string;
}

export class InscricaoPushDto {
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      host_whitelist: SERVICOS_DE_PUSH.map(
        (dominio) => new RegExp(`(^|\\.)${dominio.replace(/\./g, '\\.')}$`),
      ),
    },
    { message: 'endpoint de notificação inválido' },
  )
  @MaxLength(500)
  endpoint: string;

  @ValidateNested()
  @Type(() => ChavesPushDto)
  keys: ChavesPushDto;

  @IsOptional()
  expirationTime?: number | null;
}

export class RemoverInscricaoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  endpoint: string;
}
