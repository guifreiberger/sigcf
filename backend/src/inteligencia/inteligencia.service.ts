import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity.js';
import { hoje as dataDeHoje, somarDias } from '../common/data.js';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import {
  analisarPeso,
  avaliarAlerta,
  classificarRecorrencia,
  diasEntre,
  preverProxima,
} from './analise.js';

const JANELA_DIAS = 365;

@Injectable()
export class InteligenciaService {
  constructor(
    @InjectRepository(OrdemColeta)
    private readonly ordens: Repository<OrdemColeta>,
    @InjectRepository(Cliente)
    private readonly clientes: Repository<Cliente>,
  ) {}

  async analisarClientes() {
    const hoje = dataDeHoje();
    const [clientes, ordens] = await Promise.all([
      this.clientes.find({ where: { ativo: true }, order: { nome: 'ASC' } }),
      this.ordens.find({
        select: { clienteId: true, dataColeta: true, pesoEstimadoKg: true },
        where: {
          dataColeta: MoreThanOrEqual(somarDias(hoje, -JANELA_DIAS)),
          status: Not(StatusOrdem.CANCELADA),
        },
      }),
    ]);

    const porCliente = new Map<number, OrdemColeta[]>();
    for (const ordem of ordens) {
      porCliente.set(ordem.clienteId, [
        ...(porCliente.get(ordem.clienteId) ?? []),
        ordem,
      ]);
    }

    const analises = clientes.map((cliente) => {
      const doCliente = porCliente.get(cliente.id) ?? [];
      const datas = doCliente.map((o) => o.dataColeta).sort();
      const realizadas = datas.filter((d) => d <= hoje);
      const ultimaColeta = realizadas.at(-1) ?? null;
      const recorrencia = classificarRecorrencia(realizadas);
      const proximaPrevista = ultimaColeta
        ? preverProxima(recorrencia, ultimaColeta)
        : null;
      const proximaAgendada = datas.find((d) => d >= hoje) ?? null;

      return {
        clienteId: cliente.id,
        cliente: cliente.nome,
        totalColetas: realizadas.length,
        ultimaColeta,
        recorrencia,
        proximaPrevista,
        proximaAgendada,
        alerta: avaliarAlerta(proximaPrevista, hoje, proximaAgendada !== null),
        peso: analisarPeso(
          doCliente.flatMap((o) =>
            o.pesoEstimadoKg === null
              ? []
              : [{ data: o.dataColeta, kg: o.pesoEstimadoKg }],
          ),
        ),
      };
    });

    const alertas = analises
      .flatMap((a) =>
        a.alerta && a.proximaPrevista
          ? [
              {
                clienteId: a.clienteId,
                cliente: a.cliente,
                tipo: a.alerta,
                dataPrevista: a.proximaPrevista,
                dias: diasEntre(hoje, a.proximaPrevista),
                padrao: a.recorrencia.descricao,
              },
            ]
          : [],
      )
      .sort((a, b) => a.dias - b.dias);

    return { hoje, janelaDias: JANELA_DIAS, alertas, clientes: analises };
  }
}
