import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { opcoesTypeOrm } from './database/typeorm.config.js';
import { HealthController } from './health.controller.js';
import { MotoristasModule } from './motoristas/motoristas.module.js';
import { VeiculosModule } from './veiculos/veiculos.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...opcoesTypeOrm(), migrationsRun: true }),
    }),
    AuthModule,
    MotoristasModule,
    VeiculosModule,
    ClientesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
