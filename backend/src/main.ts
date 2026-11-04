import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configurarApp } from './app.setup.js';

async function bootstrap() {
  const app = configurarApp(
    await NestFactory.create<NestExpressApplication>(AppModule, {
      // Em produção, logs em JSON para o Log Analytics consultar cada campo.
      logger: new ConsoleLogger({
        json: process.env.NODE_ENV === 'production',
      }),
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
