import { Injectable, Logger } from '@nestjs/common';
import webpush, { WebPushError } from 'web-push';

export interface DestinoPush {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type ResultadoEnvio = 'ENVIADO' | 'EXPIRADO' | 'FALHOU';

export abstract class EnviadorPush {
  abstract readonly chavePublica: string | null;
  abstract enviar(
    destino: DestinoPush,
    conteudo: string,
  ): Promise<ResultadoEnvio>;
}

@Injectable()
export class WebPushEnviador extends EnviadorPush {
  private readonly logger = new Logger(WebPushEnviador.name);
  private readonly vapid = {
    subject: process.env.VAPID_SUBJECT ?? '',
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  };

  get chavePublica() {
    const { subject, publicKey, privateKey } = this.vapid;
    return subject && publicKey && privateKey ? publicKey : null;
  }

  async enviar(
    destino: DestinoPush,
    conteudo: string,
  ): Promise<ResultadoEnvio> {
    if (!this.chavePublica) return 'FALHOU';
    try {
      await webpush.sendNotification(
        {
          endpoint: destino.endpoint,
          keys: { p256dh: destino.p256dh, auth: destino.auth },
        },
        conteudo,
        { vapidDetails: this.vapid, TTL: 12 * 60 * 60, urgency: 'high' },
      );
      return 'ENVIADO';
    } catch (erro) {
      if (
        erro instanceof WebPushError &&
        [404, 410].includes(erro.statusCode)
      ) {
        return 'EXPIRADO';
      }
      this.logger.warn(`Falha ao enviar notificação: ${String(erro)}`);
      return 'FALHOU';
    }
  }
}
