import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnviadorPush, WebPushEnviador } from './enviador-push.js';
import { InscricaoPush } from './inscricao-push.entity.js';
import { NotificacoesController } from './notificacoes.controller.js';
import { NotificacoesService } from './notificacoes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InscricaoPush])],
  controllers: [NotificacoesController],
  providers: [
    NotificacoesService,
    { provide: EnviadorPush, useClass: WebPushEnviador },
  ],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
