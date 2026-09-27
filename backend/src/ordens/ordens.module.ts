import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacoesModule } from '../notificacoes/notificacoes.module.js';
import { OrdemColeta } from './ordem-coleta.entity.js';
import { OrdensController } from './ordens.controller.js';
import { OrdensService } from './ordens.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([OrdemColeta]), NotificacoesModule],
  controllers: [OrdensController],
  providers: [OrdensService],
})
export class OrdensModule {}
