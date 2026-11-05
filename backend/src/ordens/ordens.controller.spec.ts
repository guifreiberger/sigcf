import { CHAVE_PERFIS } from '../auth/decorators.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import type {
  AceitarColetaDto,
  AlterarStatusDto,
  CriarOrdemDto,
} from './dto/ordem.dto.js';
import { OrdensController } from './ordens.controller.js';
import type { OrdensService } from './ordens.service.js';
import { StatusOrdem } from './status-ordem.enum.js';

const gestor = { id: 1, nome: 'Ana', perfil: Perfil.GESTOR };
const joao = { id: 7, nome: 'João', perfil: Perfil.MOTORISTA };

describe('OrdensController', () => {
  const service = {
    criar: vi.fn(),
    listar: vi.fn(),
    minhas: vi.fn(),
    resumo: vi.fn(),
    detalhar: vi.fn(),
    alterarStatus: vi.fn(),
    disponiveis: vi.fn(),
    aceitar: vi.fn(),
  };
  const controller = new OrdensController(service as unknown as OrdensService);
  const perfisDa = (rota: keyof OrdensController) =>
    Reflect.getMetadata(CHAVE_PERFIS, OrdensController.prototype[rota]) as
      Perfil[] | undefined;

  beforeEach(() => vi.clearAllMocks());

  it('restringe cada rota ao perfil que a utiliza', () => {
    expect(perfisDa('criar')).toEqual([Perfil.GESTOR]);
    expect(perfisDa('listar')).toEqual([Perfil.GESTOR]);
    expect(perfisDa('resumo')).toEqual([Perfil.GESTOR]);
    expect(perfisDa('minhas')).toEqual([Perfil.MOTORISTA]);
    expect(perfisDa('disponiveis')).toEqual([Perfil.MOTORISTA]);
    expect(perfisDa('aceitar')).toEqual([Perfil.MOTORISTA]);
    // Detalhe e status ficam abertos aos dois; o service filtra pelo dono da ordem.
    expect(perfisDa('detalhar')).toBeUndefined();
    expect(perfisDa('alterarStatus')).toBeUndefined();
  });

  it('cria a ordem em nome do gestor autenticado', async () => {
    const dto = { clienteId: 3 } as CriarOrdemDto;

    await controller.criar(dto, gestor);

    expect(service.criar).toHaveBeenCalledWith(dto, gestor);
  });

  it('repassa filtros, datas e usuário às consultas', async () => {
    await controller.listar({ status: StatusOrdem.FALHA }, gestor);
    await controller.minhas({ data: '2026-11-05' }, joao);
    await controller.resumo({ data: '2026-11-05' });
    await controller.detalhar(10, joao);

    expect(service.listar).toHaveBeenCalledWith(
      { status: StatusOrdem.FALHA },
      gestor,
    );
    expect(service.minhas).toHaveBeenCalledWith(joao, '2026-11-05');
    expect(service.resumo).toHaveBeenCalledWith('2026-11-05');
    expect(service.detalhar).toHaveBeenCalledWith(10, joao);
  });

  it('altera o status em nome do usuário autenticado', async () => {
    const dto: AlterarStatusDto = { status: StatusOrdem.EM_ANDAMENTO };

    await controller.alterarStatus(10, dto, joao);

    expect(service.alterarStatus).toHaveBeenCalledWith(10, dto, joao);
  });

  it('lista as coletas disponíveis e aceita em nome do motorista autenticado', async () => {
    const dto: AceitarColetaDto = { veiculoId: 4 };

    await controller.disponiveis();
    await controller.aceitar(10, dto, joao);

    expect(service.disponiveis).toHaveBeenCalled();
    expect(service.aceitar).toHaveBeenCalledWith(10, dto, joao);
  });
});
