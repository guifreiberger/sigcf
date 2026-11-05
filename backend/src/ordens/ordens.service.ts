import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  type FindOptionsWhere,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { Cliente } from '../clientes/cliente.entity.js';
import { hoje } from '../common/data.js';
import {
  avisoColetaCancelada,
  avisoColetaDisponivel,
  avisoNovaColeta,
} from '../notificacoes/avisos.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Veiculo } from '../veiculos/veiculo.entity.js';
import {
  AceitarColetaDto,
  AlterarStatusDto,
  CriarOrdemDto,
  FiltroOrdensDto,
} from './dto/ordem.dto.js';
import { HistoricoStatus } from './historico-status.entity.js';
import { OrdemColeta } from './ordem-coleta.entity.js';
import { StatusOrdem } from './status-ordem.enum.js';
import {
  TransicaoError,
  transicoesPermitidas,
  validarTransicao,
} from './transicoes.js';

const EXCECAO_POR_ERRO = {
  INVALIDA: ConflictException,
  NAO_PERMITIDA: ForbiddenException,
  MOTIVO_OBRIGATORIO: BadRequestException,
} as const;

@Injectable()
export class OrdensService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrdemColeta)
    private readonly ordens: Repository<OrdemColeta>,
    private readonly notificacoes: NotificacoesService,
  ) {}

  async criar(dto: CriarOrdemDto, gestor: UsuarioAutenticado) {
    if ((dto.motoristaId == null) !== (dto.veiculoId == null)) {
      throw new BadRequestException(
        'Informe o motorista e o veículo, ou nenhum dos dois para disponibilizar a coleta.',
      );
    }
    if (dto.dataColeta < hoje()) {
      throw new UnprocessableEntityException(
        'A data da coleta não pode estar no passado.',
      );
    }
    const disponivel = dto.motoristaId == null;
    const statusInicial = disponivel
      ? StatusOrdem.DISPONIVEL
      : StatusOrdem.AGUARDANDO;

    const id = await this.dataSource.transaction(async (em) => {
      const cliente = await em.findOneBy(Cliente, {
        id: dto.clienteId,
        ativo: true,
      });
      if (!cliente) {
        throw new UnprocessableEntityException(
          'Cliente não encontrado ou inativo.',
        );
      }
      let veiculoId: number | null = null;
      let motoristaId: number | null = null;
      if (!disponivel) {
        veiculoId = (await this.veiculoAtivo(em, dto.veiculoId!)).id;
        const motorista = await em.findOneBy(Usuario, {
          id: dto.motoristaId,
          perfil: Perfil.MOTORISTA,
          ativo: true,
        });
        if (!motorista) {
          throw new UnprocessableEntityException(
            'Motorista não encontrado ou inativo.',
          );
        }
        motoristaId = motorista.id;
      }

      const ordem = await em.save(
        em.create(OrdemColeta, {
          clienteId: cliente.id,
          veiculoId,
          motoristaId,
          criadoPorId: gestor.id,
          enderecoColeta: dto.enderecoColeta ?? cliente.endereco,
          dataColeta: dto.dataColeta,
          pesoEstimadoKg: dto.pesoEstimadoKg ?? null,
          status: statusInicial,
          observacao: dto.observacao ?? null,
        }),
      );
      await em.insert(HistoricoStatus, {
        ordemId: ordem.id,
        usuarioId: gestor.id,
        statusAnterior: null,
        statusNovo: statusInicial,
        motivo: null,
      });
      return ordem.id;
    });

    const criada = await this.detalhar(id, gestor);
    if (criada.motoristaId == null) {
      void this.notificacoes.enviarParaMotoristas(
        avisoColetaDisponivel(criada, hoje()),
      );
    } else {
      void this.notificacoes.enviarParaUsuario(
        criada.motoristaId,
        avisoNovaColeta(criada, hoje()),
      );
    }
    return criada;
  }

  async disponiveis() {
    const ordens = await this.ordens.find({
      where: {
        status: StatusOrdem.DISPONIVEL,
        dataColeta: MoreThanOrEqual(hoje()),
      },
      relations: { cliente: true },
      order: { dataColeta: 'ASC', id: 'ASC' },
    });
    return ordens.map((o) => this.comTransicoes(o, Perfil.MOTORISTA));
  }

  // A trava na linha da ordem garante que, se dois motoristas aceitarem ao mesmo tempo,
  // o segundo espere o primeiro terminar e encontre a coleta já aceita.
  async aceitar(
    id: number,
    dto: AceitarColetaDto,
    motorista: UsuarioAutenticado,
  ) {
    await this.dataSource.transaction(async (em) => {
      const ordem = await em.findOne(OrdemColeta, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ordem) {
        throw new NotFoundException('Ordem de coleta não encontrada.');
      }
      if (ordem.status !== StatusOrdem.DISPONIVEL) {
        if (ordem.motoristaId === motorista.id) {
          throw new ConflictException('Você já aceitou esta coleta.');
        }
        throw new ConflictException(
          ordem.motoristaId == null
            ? 'Esta coleta não está mais disponível.'
            : 'Esta coleta já foi aceita por outro motorista.',
        );
      }
      const veiculo = await this.veiculoAtivo(em, dto.veiculoId);

      await em.update(OrdemColeta, ordem.id, {
        motoristaId: motorista.id,
        veiculoId: veiculo.id,
        status: StatusOrdem.AGUARDANDO,
      });
      await em.insert(HistoricoStatus, {
        ordemId: ordem.id,
        usuarioId: motorista.id,
        statusAnterior: StatusOrdem.DISPONIVEL,
        statusNovo: StatusOrdem.AGUARDANDO,
        motivo: null,
      });
    });

    return this.detalhar(id, motorista);
  }

  async listar(filtros: FiltroOrdensDto, usuario: UsuarioAutenticado) {
    const where: FindOptionsWhere<OrdemColeta> = {};
    if (filtros.data) where.dataColeta = filtros.data;
    if (filtros.status) where.status = filtros.status;
    if (filtros.motoristaId) where.motoristaId = filtros.motoristaId;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;

    const ordens = await this.ordens.find({
      where,
      relations: { cliente: true, veiculo: true, motorista: true },
      order: { dataColeta: 'DESC', id: 'DESC' },
      take: 200,
    });
    return ordens.map((o) => this.comTransicoes(o, usuario.perfil));
  }

  async minhas(motorista: UsuarioAutenticado, data = hoje()) {
    const ordens = await this.ordens.find({
      where: { motoristaId: motorista.id, dataColeta: data },
      relations: { cliente: true, veiculo: true },
      order: { id: 'ASC' },
    });
    return ordens.map((o) => this.comTransicoes(o, Perfil.MOTORISTA));
  }

  async detalhar(id: number, usuario: UsuarioAutenticado) {
    const ordem = await this.ordens.findOne({
      where: { id },
      relations: {
        cliente: true,
        veiculo: true,
        motorista: true,
        criadoPor: true,
        historico: { usuario: true },
      },
      order: { historico: { id: 'ASC' } },
    });
    if (!ordem || !this.podeVer(ordem, usuario)) {
      throw new NotFoundException('Ordem de coleta não encontrada.');
    }
    return this.comTransicoes(ordem, usuario.perfil);
  }

  async alterarStatus(
    id: number,
    dto: AlterarStatusDto,
    usuario: UsuarioAutenticado,
  ) {
    await this.dataSource.transaction(async (em) => {
      const ordem = await em.findOne(OrdemColeta, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ordem || !this.podeVer(ordem, usuario)) {
        throw new NotFoundException('Ordem de coleta não encontrada.');
      }

      try {
        validarTransicao(ordem.status, dto.status, usuario.perfil, dto.motivo);
      } catch (erro) {
        if (!(erro instanceof TransicaoError)) throw erro;
        throw new EXCECAO_POR_ERRO[erro.tipo](erro.message);
      }

      // Coleta mínima: a localização só é guardada para ações do motorista em campo.
      const local =
        usuario.perfil === Perfil.MOTORISTA ? dto.localizacao : undefined;

      await em.update(OrdemColeta, ordem.id, { status: dto.status });
      await em.insert(HistoricoStatus, {
        ordemId: ordem.id,
        usuarioId: usuario.id,
        statusAnterior: ordem.status,
        statusNovo: dto.status,
        motivo: dto.motivo?.trim() || null,
        latitude: local?.latitude ?? null,
        longitude: local?.longitude ?? null,
        precisaoMetros:
          local?.precisaoMetros == null
            ? null
            : Math.round(local.precisaoMetros),
      });
    });

    const atualizada = await this.detalhar(id, usuario);
    if (
      dto.status === StatusOrdem.CANCELADA &&
      atualizada.motoristaId != null
    ) {
      void this.notificacoes.enviarParaUsuario(
        atualizada.motoristaId,
        avisoColetaCancelada(atualizada, hoje(), dto.motivo?.trim() ?? ''),
      );
    }
    return atualizada;
  }

  async resumo(data = hoje()) {
    const linhas = await this.ordens
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .where('o.dataColeta = :data', { data })
      .groupBy('o.status')
      .getRawMany<{ status: StatusOrdem; total: string }>();

    const porStatus = Object.fromEntries(
      Object.values(StatusOrdem).map((s) => [s, 0]),
    ) as Record<StatusOrdem, number>;
    for (const linha of linhas) porStatus[linha.status] = Number(linha.total);

    const total = Object.values(porStatus).reduce((a, b) => a + b, 0);
    return { data, total, porStatus };
  }

  private async veiculoAtivo(em: EntityManager, id: number) {
    const veiculo = await em.findOneBy(Veiculo, { id, ativo: true });
    if (!veiculo) {
      throw new UnprocessableEntityException(
        'Veículo não encontrado ou inativo.',
      );
    }
    return veiculo;
  }

  private podeVer(ordem: OrdemColeta, usuario: UsuarioAutenticado) {
    return usuario.perfil === Perfil.GESTOR || ordem.motoristaId === usuario.id;
  }

  private comTransicoes(ordem: OrdemColeta, perfil: Perfil) {
    return {
      ...ordem,
      transicoesPermitidas: transicoesPermitidas(ordem.status, perfil),
    };
  }
}
