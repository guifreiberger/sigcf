import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsISO8601, Matches, MaxLength } from 'class-validator';

const apenasDigitos = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value,
);

export const IsData = () =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: '$property deve estar no formato AAAA-MM-DD',
    }),
    IsISO8601({ strict: true }, { message: '$property não é uma data válida' }),
  );

export const IsTelefone = () =>
  applyDecorators(
    apenasDigitos,
    Matches(/^\d{10,11}$/, {
      message: 'telefone deve ter DDD + número (10 ou 11 dígitos)',
    }),
  );

export const IsCnh = () =>
  applyDecorators(
    apenasDigitos,
    Matches(/^\d{11}$/, { message: 'cnh deve ter 11 dígitos' }),
  );

export const IsEmailNormalizado = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsEmail({}, { message: 'email inválido' }),
    MaxLength(160),
  );

export const ParaBooleano = () =>
  Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );
