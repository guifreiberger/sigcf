import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity.js';
import type { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Veiculo } from '../veiculos/veiculo.entity.js';
import type { CriarOrdemDto } from './dto/ordem.dto.js';
import { HistoricoStatus } from './historico-status.entity.js';
import { OrdemColeta } from './ordem-coleta.entity.js';
import { OrdensService } from './ordens.service.js';
import { StatusOrdem } from './status-ordem.enum.js';

const HOJE = '2026-11-04';

const gestor = { id: 1, nome: 'Ana', perfil: Perfil.GESTOR };
const joao = { id: 7, nome: 'João', perfil: Perfil.MOTORISTA };
const pedro = { id: 8, nome: 'Pedro', perfil: Perfil.MOTORISTA };

const cliente = { id: 3, nome: 'WEG', endereco: 'Rua A, 100', ativo: true };
const veiculo = { id: 4, placa: 'ABC1D23', ativo: true };
const motorista = {
  id: 7,
  nome: 'João',
  perfil: Perfil.MOTORISTA,
  ativo: true,
};

function ordemCom(dados: Partial<OrdemColeta> = {}) {
  return {
    id: 10,
    clienteId: 3,
    veiculoId: 4,
    motoristaId: 7,
    dataColeta: HOJE,
    enderecoColeta: 'Rua A, 100',
    pesoEstimadoKg: null,
    status: StatusOrdem.AGUARDANDO,
    cliente: { nome: 'WEG' },
    ...dados,
  } as OrdemColeta;
}

describe('OrdensService', () => {
  const em = {
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((_: unknown, dados: object) => dados),
    save: vi.fn(async (dados: object) => ({ id: 10, ...dados })),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const dataSource = {
    transaction: vi.fn((trabalho: (gerenciador: typeof em) => unknown) =>
      trabalho(em),
    ),
  };
  const ordens = {
    find: vi.fn(),
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const notificacoes = { enviarParaUsuario: vi.fn() };
  const service = new OrdensService(
    dataSource as unknown as DataSource,
    ordens as unknown as Repository<OrdemColeta>,
    notificacoes as unknown as NotificacoesService,
  );

  function cadastrosEncontrados(registros: Map<unknown, unknown>) {
    em.findOneBy.mockImplementation(
      async (entidade: unknown) => registros.get(entidade) ?? null,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${HOJE}T15:00:00Z`));
  });

  afterEach(() => vi.useRealTimers());

  describe('criar', () => {
    const dto: CriarOrdemDto = {
      clienteId: 3,
      veiculoId: 4,
      motoristaId: 7,
      dataColeta: HOJE,
    };
    const todosAtivos = new Map<unknown, unknown>([
      [Cliente, cliente],
      [Veiculo, veiculo],
      [Usuario, motorista],
    ]);

    it('recusa data no passado antes de abrir a transação', async () => {
      await expect(
        service.criar({ ...dto, dataColeta: '2026-11-03' }, gestor),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['o cliente', Cliente, 'Cliente não encontrado ou inativo.'],
      ['o veículo', Veiculo, 'Veículo não encontrado ou inativo.'],
      ['o motorista', Usuario, 'Motorista não encontrado ou inativo.'],
    ])(
      'recusa quando %s não existe ou está inativo',
      async (_, entidade, msg) => {
        const registros = new Map(todosAtivos);
        registros.delete(entidade);
        cadastrosEncontrados(registros);

        await expect(service.criar(dto, gestor)).rejects.toThrow(
          new UnprocessableEntityException(msg),
        );
        expect(em.save).not.toHaveBeenCalled();
      },
    );

    it('busca apenas cadastros ativos e motorista com perfil de motorista', async () => {
      cadastrosEncontrados(todosAtivos);
      ordens.findOne.mockResolvedValue(ordemCom());

      await service.criar(dto, gestor);

      expect(em.findOneBy).toHaveBeenCalledWith(Cliente, {
        id: 3,
        ativo: true,
      });
      expect(em.findOneBy).toHaveBeenCalledWith(Veiculo, {
        id: 4,
        ativo: true,
      });
      expect(em.findOneBy).toHaveBeenCalledWith(Usuario, {
        id: 7,
        perfil: Perfil.MOTORISTA,
        ativo: true,
      });
    });

    it('cria a ordem aguardando, usando o endereço do cliente quando não informado', async () => {
      cadastrosEncontrados(todosAtivos);
      ordens.findOne.mockResolvedValue(ordemCom());

      await service.criar(dto, gestor);

      expect(em.create).toHaveBeenCalledWith(OrdemColeta, {
        clienteId: 3,
        veiculoId: 4,
        motoristaId: 7,
        criadoPorId: 1,
        enderecoColeta: 'Rua A, 100',
        dataColeta: HOJE,
        pesoEstimadoKg: null,
        status: StatusOrdem.AGUARDANDO,
        observacao: null,
      });
    });

    it('mantém endereço, peso e observação informados pelo gestor', async () => {
      cadastrosEncontrados(todosAtivos);
      ordens.findOne.mockResolvedValue(ordemCom());

      await service.criar(
        {
          ...dto,
          enderecoColeta: 'Portaria 2',
          pesoEstimadoKg: 350,
          observacao: 'Ligar antes',
        },
        gestor,
      );

      expect(em.create).toHaveBeenCalledWith(
        OrdemColeta,
        expect.objectContaining({
          enderecoColeta: 'Portaria 2',
          pesoEstimadoKg: 350,
          observacao: 'Ligar antes',
        }),
      );
    });

    it('registra a criação no histórico dentro da mesma transação', async () => {
      cadastrosEncontrados(todosAtivos);
      ordens.findOne.mockResolvedValue(ordemCom());

      await service.criar(dto, gestor);

      expect(em.insert).toHaveBeenCalledWith(HistoricoStatus, {
        ordemId: 10,
        usuarioId: 1,
        statusAnterior: null,
        statusNovo: StatusOrdem.AGUARDANDO,
        motivo: null,
      });
    });

    it('devolve a ordem criada e avisa o motorista', async () => {
      cadastrosEncontrados(todosAtivos);
      ordens.findOne.mockResolvedValue(ordemCom());

      const criada = await service.criar(dto, gestor);

      expect(criada).toMatchObject({
        id: 10,
        transicoesPermitidas: [StatusOrdem.CANCELADA],
      });
      expect(notificacoes.enviarParaUsuario).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          titulo: 'Nova coleta para você',
          tag: 'ordem-10',
        }),
      );
    });
  });

  describe('listar', () => {
    it('monta o filtro só com os campos informados', async () => {
      ordens.find.mockResolvedValue([]);

      await service.listar({ status: StatusOrdem.FALHA, clienteId: 3 }, gestor);

      expect(ordens.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: StatusOrdem.FALHA, clienteId: 3 },
          take: 200,
        }),
      );
    });

    it('aceita todos os filtros juntos', async () => {
      ordens.find.mockResolvedValue([]);

      await service.listar(
        {
          data: HOJE,
          status: StatusOrdem.AGUARDANDO,
          motoristaId: 7,
          clienteId: 3,
        },
        gestor,
      );

      expect(ordens.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dataColeta: HOJE,
            status: StatusOrdem.AGUARDANDO,
            motoristaId: 7,
            clienteId: 3,
          },
        }),
      );
    });

    it('anexa as transições que o perfil pode executar', async () => {
      ordens.find.mockResolvedValue([ordemCom()]);

      const [ordem] = await service.listar({}, gestor);

      expect(ordem.transicoesPermitidas).toEqual([StatusOrdem.CANCELADA]);
    });
  });

  describe('minhas', () => {
    it('lista as coletas de hoje do motorista autenticado', async () => {
      ordens.find.mockResolvedValue([ordemCom()]);

      const [ordem] = await service.minhas(joao);

      expect(ordens.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { motoristaId: 7, dataColeta: HOJE },
        }),
      );
      expect(ordem.transicoesPermitidas).toEqual([StatusOrdem.EM_ANDAMENTO]);
    });

    it('aceita outra data', async () => {
      ordens.find.mockResolvedValue([]);

      await service.minhas(joao, '2026-11-05');

      expect(ordens.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { motoristaId: 7, dataColeta: '2026-11-05' },
        }),
      );
    });
  });

  describe('detalhar', () => {
    it('permite ao gestor ver qualquer ordem', async () => {
      ordens.findOne.mockResolvedValue(ordemCom({ motoristaId: 8 }));

      await expect(service.detalhar(10, gestor)).resolves.toMatchObject({
        id: 10,
      });
    });

    it('permite ao motorista ver a própria ordem', async () => {
      ordens.findOne.mockResolvedValue(ordemCom());

      await expect(service.detalhar(10, joao)).resolves.toMatchObject({
        id: 10,
      });
    });

    it('esconde do motorista a ordem de outro, como se não existisse', async () => {
      ordens.findOne.mockResolvedValue(ordemCom());

      await expect(service.detalhar(10, pedro)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança NotFound quando a ordem não existe', async () => {
      ordens.findOne.mockResolvedValue(null);

      await expect(service.detalhar(99, gestor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('alterarStatus', () => {
    function ordemNoBanco(dados: Partial<OrdemColeta> = {}) {
      const ordem = ordemCom(dados);
      em.findOne.mockResolvedValue(ordem);
      ordens.findOne.mockResolvedValue(ordem);
    }

    it('trava a linha da ordem durante a alteração', async () => {
      ordemNoBanco();

      await service.alterarStatus(
        10,
        { status: StatusOrdem.EM_ANDAMENTO },
        joao,
      );

      expect(em.findOne).toHaveBeenCalledWith(OrdemColeta, {
        where: { id: 10 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('lança NotFound quando a ordem não existe', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(
        service.alterarStatus(99, { status: StatusOrdem.EM_ANDAMENTO }, joao),
      ).rejects.toThrow(NotFoundException);
    });

    it('impede o motorista de alterar a ordem de outro', async () => {
      ordemNoBanco();

      await expect(
        service.alterarStatus(10, { status: StatusOrdem.EM_ANDAMENTO }, pedro),
      ).rejects.toThrow(NotFoundException);
      expect(em.update).not.toHaveBeenCalled();
    });

    it.each([
      [
        'pular etapas',
        StatusOrdem.CONCLUIDA,
        joao,
        undefined,
        ConflictException,
      ],
      [
        'agir no lugar de outro perfil',
        StatusOrdem.EM_ANDAMENTO,
        gestor,
        undefined,
        ForbiddenException,
      ],
      [
        'cancelar sem motivo',
        StatusOrdem.CANCELADA,
        gestor,
        '   ',
        BadRequestException,
      ],
    ])(
      'converte a regra violada (%s) no erro HTTP adequado',
      async (_, status, usuario, motivo, excecao) => {
        ordemNoBanco();

        await expect(
          service.alterarStatus(10, { status, motivo }, usuario),
        ).rejects.toThrow(excecao);
        expect(em.update).not.toHaveBeenCalled();
      },
    );

    it('grava a localização do motorista em campo, arredondando a precisão', async () => {
      ordemNoBanco();

      await service.alterarStatus(
        10,
        {
          status: StatusOrdem.EM_ANDAMENTO,
          localizacao: {
            latitude: -26.48,
            longitude: -49.07,
            precisaoMetros: 12.6,
          },
        },
        joao,
      );

      expect(em.update).toHaveBeenCalledWith(OrdemColeta, 10, {
        status: StatusOrdem.EM_ANDAMENTO,
      });
      expect(em.insert).toHaveBeenCalledWith(HistoricoStatus, {
        ordemId: 10,
        usuarioId: 7,
        statusAnterior: StatusOrdem.AGUARDANDO,
        statusNovo: StatusOrdem.EM_ANDAMENTO,
        motivo: null,
        latitude: -26.48,
        longitude: -49.07,
        precisaoMetros: 13,
      });
    });

    it('aceita localização sem a precisão', async () => {
      ordemNoBanco();

      await service.alterarStatus(
        10,
        {
          status: StatusOrdem.EM_ANDAMENTO,
          localizacao: { latitude: -26.48, longitude: -49.07 },
        },
        joao,
      );

      expect(em.insert).toHaveBeenCalledWith(
        HistoricoStatus,
        expect.objectContaining({ latitude: -26.48, precisaoMetros: null }),
      );
    });

    it('descarta a localização enviada pelo gestor (coleta mínima)', async () => {
      ordemNoBanco();

      await service.alterarStatus(
        10,
        {
          status: StatusOrdem.CANCELADA,
          motivo: 'Cliente desistiu',
          localizacao: { latitude: -26.48, longitude: -49.07 },
        },
        gestor,
      );

      expect(em.insert).toHaveBeenCalledWith(
        HistoricoStatus,
        expect.objectContaining({
          latitude: null,
          longitude: null,
          precisaoMetros: null,
        }),
      );
    });

    it('avisa o motorista quando a coleta é cancelada, com o motivo', async () => {
      ordemNoBanco();

      await service.alterarStatus(
        10,
        { status: StatusOrdem.CANCELADA, motivo: '  Cliente desistiu  ' },
        gestor,
      );

      expect(em.insert).toHaveBeenCalledWith(
        HistoricoStatus,
        expect.objectContaining({ motivo: 'Cliente desistiu' }),
      );
      expect(notificacoes.enviarParaUsuario).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          titulo: 'Coleta cancelada',
          corpo: 'WEG, hoje: Cliente desistiu',
        }),
      );
    });

    it('não envia aviso nas demais alterações', async () => {
      ordemNoBanco({ status: StatusOrdem.EM_ANDAMENTO });

      await service.alterarStatus(10, { status: StatusOrdem.CONCLUIDA }, joao);

      expect(notificacoes.enviarParaUsuario).not.toHaveBeenCalled();
    });
  });

  describe('resumo', () => {
    function linhasDoBanco(linhas: { status: StatusOrdem; total: string }[]) {
      const consulta = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(linhas),
      };
      ordens.createQueryBuilder.mockReturnValue(consulta);
      return consulta;
    }

    it('conta por status, preenchendo com zero os que não aparecem', async () => {
      linhasDoBanco([
        { status: StatusOrdem.AGUARDANDO, total: '3' },
        { status: StatusOrdem.CONCLUIDA, total: '2' },
      ]);

      await expect(service.resumo()).resolves.toEqual({
        data: HOJE,
        total: 5,
        porStatus: {
          AGUARDANDO: 3,
          EM_ANDAMENTO: 0,
          CONCLUIDA: 2,
          FALHA: 0,
          CANCELADA: 0,
        },
      });
    });

    it('consulta a data pedida', async () => {
      const consulta = linhasDoBanco([]);

      const resumo = await service.resumo('2026-11-10');

      expect(consulta.where).toHaveBeenCalledWith('o.dataColeta = :data', {
        data: '2026-11-10',
      });
      expect(resumo.total).toBe(0);
    });
  });
});
