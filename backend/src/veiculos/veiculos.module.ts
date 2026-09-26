import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Veiculo } from './veiculo.entity.js';
import { VeiculosController } from './veiculos.controller.js';
import { VeiculosService } from './veiculos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Veiculo])],
  controllers: [VeiculosController],
  providers: [VeiculosService],
})
export class VeiculosModule {}
