import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { RelatoriosController } from './relatorios.controller.js';
import { RelatoriosService } from './relatorios.service.js';

// Dashboard (RF09) e relatório de coletas por período (RF15), restritos ao gestor.
@Module({
  imports: [TypeOrmModule.forFeature([OrdemColeta])],
  controllers: [RelatoriosController],
  providers: [RelatoriosService],
})
export class RelatoriosModule {}
