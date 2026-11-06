import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import { RegistrarPontosDto } from './dto/pontos.dto.js';
import { PontoTrajeto } from './ponto-trajeto.entity.js';
import {
  type Corrida,
  corridasDaLeitura,
  distanciaPercorrida,
  periodoDaCorrida,
  PRECISAO_MAXIMA_METROS,
  pontosConfiaveis,
  resumirTrajeto,
  TOLERANCIA_DA_CORRIDA_MS,
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

  // Coleta mínima: só há rastreamento durante as coletas do próprio motorista. Cada leitura vai
  // para a coleta que estava em andamento na hora em que foi feita, mesmo chegando atrasada.
  async registrar(
    motorista: UsuarioAutenticado,
    { pontos }: RegistrarPontosDto,
  ) {
    const leituras = pontos.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      precisaoMetros:
        p.precisaoMetros == null ? null : Math.round(p.precisaoMetros),
      registradoEm: new Date(p.registradoEm),
    }));
    const maisAntiga = Math.min(
      ...leituras.map((l) => l.registradoEm.getTime()),
    );
    const corridas = await this.corridasDoMotorista(
      motorista.id,
      new Date(maisAntiga - TOLERANCIA_DA_CORRIDA_MS),
    );

    const registros = leituras.flatMap((leitura) =>
      corridasDaLeitura(leitura.registradoEm, corridas).map((ordemId) => ({
        ordemId,
        ...leitura,
      })),
    );
    if (!registros.length) {
      // Leituras antigas demais durante uma coleta: descarta e segue.
      if (corridas.some((c) => !c.fim)) return;
      throw new ConflictException(
        'Nenhuma coleta em andamento para registrar o trajeto.',
      );
    }
    await this.pontos.insert(registros);

    // A distância de uma coleta é gravada quando ela termina; leituras que chegam depois
    // precisam atualizá-la.
    const terminadas = new Set(
      corridas.filter((c) => c.fim).map((c) => c.ordemId),
    );
    const atrasadas = new Set(
      registros.map((r) => r.ordemId).filter((id) => terminadas.has(id)),
    );
    for (const ordemId of atrasadas) await this.atualizarDistancia(ordemId);
  }

  // Coletas do motorista em andamento ou terminadas desde o momento dado. Quem termina uma
  // coleta atualiza a ordem, então a data de atualização nunca é anterior ao fim da corrida.
  private async corridasDoMotorista(
    motoristaId: number,
    desde: Date,
  ): Promise<Corrida[]> {
    const ordens = await this.ordens.find({
      where: [
        { motoristaId, status: StatusOrdem.EM_ANDAMENTO },
        {
          motoristaId,
          status: In([
            StatusOrdem.CONCLUIDA,
            StatusOrdem.FALHA,
            StatusOrdem.CANCELADA,
          ]),
          updatedAt: MoreThanOrEqual(desde),
        },
      ],
      relations: { historico: true },
      order: { historico: { id: 'ASC' } },
    });
    return ordens.flatMap((ordem) => {
      const { inicio, fim } = periodoDaCorrida(ordem.historico);
      return inicio ? [{ ordemId: ordem.id, inicio, fim }] : [];
    });
  }

  private async atualizarDistancia(ordemId: number) {
    const leituras = await this.pontos.find({
      select: CAMPOS_DO_PONTO,
      where: { ordemId },
    });
    await this.ordens.update(ordemId, {
      distanciaMetros: distanciaPercorrida(pontosConfiaveis(leituras)),
    });
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
