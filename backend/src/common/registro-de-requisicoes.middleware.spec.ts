import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RegistroDeRequisicoes } from './registro-de-requisicoes.middleware.js';

function requisicao(metodo: string, url: string, status: number) {
  const req = { method: metodo, originalUrl: url } as Request;
  const res = Object.assign(new EventEmitter(), {
    statusCode: status,
  }) as unknown as Response;
  return { req, res };
}

describe('RegistroDeRequisicoes', () => {
  const middleware = new RegistroDeRequisicoes();
  let registro: ReturnType<typeof vi.spyOn>;
  const proximo = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    registro = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => registro.mockRestore());

  it('registra método, rota, status e duração quando a resposta termina', () => {
    const { req, res } = requisicao('PATCH', '/api/ordens/42/status', 200);

    middleware.use(req, res, proximo);
    expect(proximo).toHaveBeenCalled();
    expect(registro).not.toHaveBeenCalled();

    res.emit('finish');
    expect(registro).toHaveBeenCalledWith({
      metodo: 'PATCH',
      rota: '/api/ordens/42/status',
      status: 200,
      duracaoMs: expect.any(Number),
    });
  });

  it('não registra a query string, que pode conter dados de filtro', () => {
    const { req, res } = requisicao('GET', '/api/ordens?clienteId=3', 200);

    middleware.use(req, res, proximo);
    res.emit('finish');

    expect(registro).toHaveBeenCalledWith(
      expect.objectContaining({ rota: '/api/ordens' }),
    );
  });

  it('ignora o health check bem-sucedido, chamado a cada poucos segundos', () => {
    const { req, res } = requisicao('GET', '/api/health', 200);

    middleware.use(req, res, proximo);
    res.emit('finish');

    expect(registro).not.toHaveBeenCalled();
  });

  it('registra o health check quando ele falha', () => {
    const { req, res } = requisicao('GET', '/api/health', 500);

    middleware.use(req, res, proximo);
    res.emit('finish');

    expect(registro).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 }),
    );
  });
});
