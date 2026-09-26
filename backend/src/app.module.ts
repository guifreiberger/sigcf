import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { opcoesTypeOrm } from './database/typeorm.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...opcoesTypeOrm(), migrationsRun: true }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
