import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../clientes/cliente.entity.js';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { InteligenciaController } from './inteligencia.controller.js';
import { InteligenciaService } from './inteligencia.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([OrdemColeta, Cliente])],
  controllers: [InteligenciaController],
  providers: [InteligenciaService],
})
export class InteligenciaModule {}
