import { CHAVE_PERFIS } from '../auth/decorators.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { RelatoriosController } from './relatorios.controller.js';
import type { RelatoriosService } from './relatorios.service.js';

describe('RelatoriosController', () => {
  const service = { dashboard: vi.fn(), coletas: vi.fn() };
  const controller = new RelatoriosController(
    service as unknown as RelatoriosService,
  );

  it('é restrito ao gestor', () => {
    expect(Reflect.getMetadata(CHAVE_PERFIS, RelatoriosController)).toEqual([
      Perfil.GESTOR,
    ]);
  });

  it('repassa o período e os filtros ao service', async () => {
    const periodo = { de: '2026-11-01', ate: '2026-11-30' };

    await controller.dashboard(periodo);
    await controller.coletas({ ...periodo, motoristaId: 7 });

    expect(service.dashboard).toHaveBeenCalledWith(periodo);
    expect(service.coletas).toHaveBeenCalledWith({
      ...periodo,
      motoristaId: 7,
    });
  });
});
