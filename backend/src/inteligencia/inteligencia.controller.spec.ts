import { CHAVE_PERFIS } from '../auth/decorators.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { InteligenciaController } from './inteligencia.controller.js';
import type { InteligenciaService } from './inteligencia.service.js';

describe('InteligenciaController', () => {
  const analise = { hoje: '2026-11-04', alertas: [], clientes: [] };
  const service = { analisarClientes: vi.fn().mockResolvedValue(analise) };
  const controller = new InteligenciaController(
    service as unknown as InteligenciaService,
  );

  it('é restrito ao gestor', () => {
    expect(Reflect.getMetadata(CHAVE_PERFIS, InteligenciaController)).toEqual([
      Perfil.GESTOR,
    ]);
  });

  it('devolve a análise dos clientes', async () => {
    await expect(controller.clientes()).resolves.toBe(analise);
  });
});
