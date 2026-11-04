import type { DataSource } from 'typeorm';
import { CHAVE_PUBLICO } from './auth/decorators.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const dataSource = { query: vi.fn() };
  const controller = new HealthController(dataSource as unknown as DataSource);

  it('é público, para o orquestrador verificar a aplicação sem token', () => {
    expect(
      Reflect.getMetadata(CHAVE_PUBLICO, HealthController.prototype.verificar),
    ).toBe(true);
  });

  it('responde ok quando o banco responde', async () => {
    dataSource.query.mockResolvedValue([{ 1: 1 }]);

    await expect(controller.verificar()).resolves.toEqual({ status: 'ok' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('falha quando o banco está fora do ar', async () => {
    dataSource.query.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(controller.verificar()).rejects.toThrow('ECONNREFUSED');
  });
});
