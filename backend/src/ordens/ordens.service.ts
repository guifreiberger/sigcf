import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type FindOptionsWhere, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { Cliente } from '../clientes/cliente.entity.js';
import { hoje } from '../common/data.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Veiculo } from '../veiculos/veiculo.entity.js';
import {
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
  ) {}

  async criar(dto: CriarOrdemDto, gestor: UsuarioAutenticado) {
    if (dto.dataColeta < hoje()) {
      throw new UnprocessableEntityException(
        'A data da coleta não pode estar no passado.',
      );
    }

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
      const veiculo = await em.findOneBy(Veiculo, {
        id: dto.veiculoId,
        ativo: true,
      });
      if (!veiculo) {
        throw new UnprocessableEntityException(
          'Veículo não encontrado ou inativo.',
        );
      }
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

      const ordem = await em.save(
        em.create(OrdemColeta, {
          clienteId: cliente.id,
          veiculoId: veiculo.id,
          motoristaId: motorista.id,
          criadoPorId: gestor.id,
          enderecoColeta: dto.enderecoColeta ?? cliente.endereco,
          dataColeta: dto.dataColeta,
          status: StatusOrdem.AGUARDANDO,
          observacao: dto.observacao ?? null,
        }),
      );
      await em.insert(HistoricoStatus, {
        ordemId: ordem.id,
        usuarioId: gestor.id,
        statusAnterior: null,
        statusNovo: StatusOrdem.AGUARDANDO,
        motivo: null,
      });
      return ordem.id;
    });

    return this.detalhar(id, gestor);
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

      await em.update(OrdemColeta, ordem.id, { status: dto.status });
      await em.insert(HistoricoStatus, {
        ordemId: ordem.id,
        usuarioId: usuario.id,
        statusAnterior: ordem.status,
        statusNovo: dto.status,
        motivo: dto.motivo?.trim() || null,
      });
    });

    return this.detalhar(id, usuario);
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
