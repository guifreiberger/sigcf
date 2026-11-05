import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { PontoTrajeto } from './ponto-trajeto.entity.js';
import { RastreamentoController } from './rastreamento.controller.js';
import { RastreamentoService } from './rastreamento.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PontoTrajeto, OrdemColeta])],
  controllers: [RastreamentoController],
  providers: [RastreamentoService],
})
export class RastreamentoModule {}
