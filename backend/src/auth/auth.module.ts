import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { lerSegredoJwt } from './segredo-jwt.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'login', ttl: 60_000, limit: 5 }],
      errorMessage:
        'Muitas tentativas de login. Aguarde um minuto e tente novamente.',
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: lerSegredoJwt(),
        signOptions: {
          expiresIn: Number(process.env.JWT_EXPIRES_IN_SEGUNDOS ?? 28800),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
