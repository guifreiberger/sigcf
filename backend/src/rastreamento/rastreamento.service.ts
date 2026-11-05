import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import { RegistrarPontosDto } from './dto/pontos.dto.js';
import { PontoTrajeto } from './ponto-trajeto.entity.js';
import {
  periodoDaCorrida,
  PRECISAO_MAXIMA_METROS,
  resumirTrajeto,
} from './trajeto.js';

const CAMPOS_DO_PONTO = {
  latitude: true,
  longitude: true,
  precisaoMetros: true,
  registradoEm: true,
} as const;

@Injectable()
export class RastreamentoService {
  constructor(
    @InjectRepository(PontoTrajeto)
    private readonly pontos: Repository<PontoTrajeto>,
    @InjectRepository(OrdemColeta)
    private readonly ordens: Repository<OrdemColeta>,
  ) {}

  // Coleta mínima: só há rastreamento enquanto o próprio motorista tem coleta em andamento.
  async registrar(
    motorista: UsuarioAutenticado,
    { pontos }: RegistrarPontosDto,
  ) {
    const emAndamento = await this.ordens.find({
      select: { id: true },
      where: { motoristaId: motorista.id, status: StatusOrdem.EM_ANDAMENTO },
    });
    if (!emAndamento.length) {
      throw new ConflictException(
        'Nenhuma coleta em andamento para registrar o trajeto.',
      );
    }

    await this.pontos.insert(
      emAndamento.flatMap(({ id }) =>
        pontos.map((p) => ({
          ordemId: id,
          latitude: p.latitude,
          longitude: p.longitude,
          precisaoMetros:
            p.precisaoMetros == null ? null : Math.round(p.precisaoMetros),
          registradoEm: new Date(p.registradoEm),
        })),
      ),
    );
  }

  async trajeto(ordemId: number) {
    const ordem = await this.ordens.findOne({
      where: { id: ordemId },
      relations: { historico: true },
      order: { historico: { id: 'ASC' } },
    });
    if (!ordem) throw new NotFoundException('Ordem de coleta não encontrada.');

    const leituras = await this.pontos.find({
      select: CAMPOS_DO_PONTO,
      where: { ordemId },
    });
    const { inicio, fim } = periodoDaCorrida(ordem.historico);
    return {
      ordemId,
      status: ordem.status,
      inicio,
      fim,
      ...resumirTrajeto(leituras, inicio, fim, new Date()),
    };
  }

  async emRota() {
    const ordens = await this.ordens.find({
      where: { status: StatusOrdem.EM_ANDAMENTO },
      relations: {
        motorista: true,
        cliente: true,
        veiculo: true,
        historico: true,
      },
      order: { id: 'ASC', historico: { id: 'ASC' } },
    });

    // Uma coleta só entra em andamento depois de ter motorista e veículo definidos.
    return Promise.all(
      ordens.map(async (ordem) => ({
        ordemId: ordem.id,
        motorista: { id: ordem.motorista!.id, nome: ordem.motorista!.nome },
        cliente: ordem.cliente.nome,
        enderecoColeta: ordem.enderecoColeta,
        placa: ordem.veiculo!.placa,
        inicio: periodoDaCorrida(ordem.historico).inicio,
        ultimaPosicao: await this.ultimaPosicao(ordem.id),
      })),
    );
  }

  private ultimaPosicao(ordemId: number) {
    return this.pontos.findOne({
      select: CAMPOS_DO_PONTO,
      where: [
        { ordemId, precisaoMetros: LessThanOrEqual(PRECISAO_MAXIMA_METROS) },
        { ordemId, precisaoMetros: IsNull() },
      ],
      order: { registradoEm: 'DESC', id: 'DESC' },
    });
  }
}
