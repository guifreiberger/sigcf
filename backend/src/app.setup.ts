import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

export function configurarApp(app: NestExpressApplication) {
  app.setGlobalPrefix('api');
  // A API fica atrás do nginx e do proxy da nuvem: o IP real do cliente (usado no limite
  // de tentativas de login) chega no X-Forwarded-For, aceito só de endereços da rede interna.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  return app;
}
