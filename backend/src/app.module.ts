import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { opcoesTypeOrm } from './database/typeorm.config.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...opcoesTypeOrm(), migrationsRun: true }),
    }),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
