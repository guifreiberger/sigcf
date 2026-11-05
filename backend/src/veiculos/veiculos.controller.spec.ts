import { CHAVE_PERFIS } from '../auth/decorators.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { VeiculosController } from './veiculos.controller.js';
import type { VeiculosService } from './veiculos.service.js';

describe('VeiculosController', () => {
  const service = {
    listar: vi.fn().mockResolvedValue([]),
    buscar: vi.fn().mockResolvedValue({ id: 1 }),
    criar: vi.fn().mockResolvedValue({ id: 2 }),
    atualizar: vi.fn().mockResolvedValue({ id: 1 }),
    desativar: vi.fn().mockResolvedValue(undefined),
  };
  const controller = new VeiculosController(
    service as unknown as VeiculosService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('é restrito ao gestor', () => {
    expect(Reflect.getMetadata(CHAVE_PERFIS, VeiculosController)).toEqual([
      Perfil.GESTOR,
    ]);
  });

  it('repassa o filtro de situação ao listar', async () => {
    await expect(controller.listar({ ativo: true })).resolves.toEqual([]);
    expect(service.listar).toHaveBeenCalledWith(true);
  });

  it('delega busca, criação, atualização e desativação ao service', async () => {
    const dto = {} as never;

    await expect(controller.buscar(1)).resolves.toEqual({ id: 1 });
    await expect(controller.criar(dto)).resolves.toEqual({ id: 2 });
    await expect(controller.atualizar(1, dto)).resolves.toEqual({ id: 1 });
    await controller.desativar(1);

    expect(service.buscar).toHaveBeenCalledWith(1);
    expect(service.criar).toHaveBeenCalledWith(dto);
    expect(service.atualizar).toHaveBeenCalledWith(1, dto);
    expect(service.desativar).toHaveBeenCalledWith(1);
  });
});
