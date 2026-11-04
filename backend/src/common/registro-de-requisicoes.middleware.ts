import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// Uma linha por requisição, com rota, status e tempo de resposta. Em produção os logs saem em
// JSON e vão para o Log Analytics, onde viram consultas de latência e de erros (observabilidade).
@Injectable()
export class RegistroDeRequisicoes implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const inicio = performance.now();
    res.on('finish', () => {
      const rota = req.originalUrl.split('?')[0];
      // O health check é chamado a cada poucos segundos e só interessa quando falha.
      if (rota === '/api/health' && res.statusCode < 400) return;
      this.logger.log({
        metodo: req.method,
        rota,
        status: res.statusCode,
        duracaoMs: Math.round(performance.now() - inicio),
      });
    });
    next();
  }
}
