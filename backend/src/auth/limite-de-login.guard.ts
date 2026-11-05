import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Conta as tentativas por IP e e-mail: protege cada conta contra força bruta sem bloquear
// os colegas que entram pela mesma rede (o Wi-Fi da empresa) no início do turno.
@Injectable()
export class LimiteDeLoginGuard extends ThrottlerGuard {
  protected override getTracker(req: {
    ip?: string;
    body?: { email?: unknown };
  }): Promise<string> {
    const email = req.body?.email;
    const conta = typeof email === 'string' ? email.trim().toLowerCase() : '';
    return Promise.resolve(`${req.ip}:${conta}`);
  }
}
