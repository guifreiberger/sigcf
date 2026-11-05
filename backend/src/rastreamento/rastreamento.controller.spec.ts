import { CHAVE_PERFIS } from '../auth/decorators.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { RastreamentoController } from './rastreamento.controller.js';
import type { RastreamentoService } from './rastreamento.service.js';

describe('RastreamentoController', () => {
  const service = {
    registrar: vi.fn(),
    emRota: vi.fn().mockResolvedValue([]),
    trajeto: vi.fn().mockResolvedValue({ ordemId: 10 }),
  };
  const controller = new RastreamentoController(
    service as unknown as RastreamentoService,
  );
  const perfisDa = (rota: keyof RastreamentoController) =>
    Reflect.getMetadata(
      CHAVE_PERFIS,
      RastreamentoController.prototype[rota],
    ) as Perfil[] | undefined;

  it('só o motorista envia pontos e só o gestor acompanha', () => {
    expect(perfisDa('registrar')).toEqual([Perfil.MOTORISTA]);
    expect(perfisDa('emRota')).toEqual([Perfil.GESTOR]);
    expect(perfisDa('trajeto')).toEqual([Perfil.GESTOR]);
  });

  it('registra os pontos em nome do motorista autenticado', async () => {
    const joao = { id: 7, nome: 'João', perfil: Perfil.MOTORISTA };
    const dto = { pontos: [] };

    await controller.registrar(dto, joao);

    expect(service.registrar).toHaveBeenCalledWith(joao, dto);
  });

  it('delega as consultas do gestor ao service', async () => {
    await expect(controller.emRota()).resolves.toEqual([]);
    await expect(controller.trajeto(10)).resolves.toEqual({ ordemId: 10 });
    expect(service.trajeto).toHaveBeenCalledWith(10);
  });
});
