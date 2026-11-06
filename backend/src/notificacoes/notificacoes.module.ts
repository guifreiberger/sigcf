import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AparelhoApp } from './aparelho-app.entity.js';
import { EnviadorFcm, FirebaseEnviador } from './enviador-fcm.js';
import { EnviadorPush, WebPushEnviador } from './enviador-push.js';
import { InscricaoPush } from './inscricao-push.entity.js';
import { NotificacoesController } from './notificacoes.controller.js';
import { NotificacoesService } from './notificacoes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InscricaoPush, AparelhoApp])],
  controllers: [NotificacoesController],
  providers: [
    NotificacoesService,
    { provide: EnviadorPush, useClass: WebPushEnviador },
    { provide: EnviadorFcm, useClass: FirebaseEnviador },
  ],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
