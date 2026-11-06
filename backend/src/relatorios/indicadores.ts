import { somarDias } from '../common/data.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import { periodoDaCorrida } from '../rastreamento/trajeto.js';

// Até dois meses, o gráfico de peso mostra cada dia; acima disso, cada mês.
const DIAS_PARA_AGRUPAR_POR_DIA = 62;

export type Agrupamento = 'dia' | 'mes';

export interface OrdemDoIndicador {
  id: number;
  dataColeta: string;
  status: StatusOrdem;
  clienteId: number;
  cliente: { nome: string };
  motoristaId: number | null;
  motorista?: { nome: string } | null;
  pesoRealKg: number | null;
  distanciaMetros: number | null;
  duracaoSegundos: number | null;
}

interface PassoDoHistorico {
  statusAnterior: StatusOrdem | null;
  statusNovo: StatusOrdem;
  motivo: string | null;
  createdAt: Date;
}

export interface OrdemDoRelatorio extends OrdemDoIndicador {
  enderecoColeta: string;
  pesoEstimadoKg: number | null;
  veiculo?: { placa: string } | null;
  historico: PassoDoHistorico[];
}

const emDias = (data: string) => Date.parse(`${data}T00:00:00Z`) / 86_400_000;

export function diasEntre(de: string, ate: string) {
  return emDias(ate) - emDias(de) + 1;
}

export function agrupamentoDoPeriodo(de: string, ate: string): Agrupamento {
  return diasEntre(de, ate) <= DIAS_PARA_AGRUPAR_POR_DIA ? 'dia' : 'mes';
}

export function periodosEntre(
  de: string,
  ate: string,
  agrupamento: Agrupamento,
) {
  const periodos: string[] = [];
  if (agrupamento === 'dia') {
    for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) periodos.push(dia);
    return periodos;
  }
  for (let mes = de.slice(0, 7); mes <= ate.slice(0, 7);) {
    periodos.push(mes);
    const [ano, numero] = mes.split('-').map(Number);
    mes =
      numero === 12
        ? `${ano + 1}-01`
        : `${ano}-${String(numero + 1).padStart(2, '0')}`;
  }
  return periodos;
}

// Somas em quilos com duas casas, sem o erro de arredondamento do ponto flutuante.
const somarKg = (valores: (number | null)[]) =>
  Math.round(
    valores.reduce<number>((total, kg) => total + (kg ?? 0), 0) * 100,
  ) / 100;

const media = (valores: number[]) =>
  valores.length
    ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
    : null;

const duracoes = (ordens: OrdemDoIndicador[]) =>
  ordens.map((o) => o.duracaoSegundos).filter((d): d is number => d !== null);

// Indicadores do dashboard do gestor (RF09). O peso é sempre o da balança: concluídas que
// ainda não foram pesadas aparecem em "semPesagem", para o gestor lembrar de registrar.
export function resumirDashboard(
  ordens: OrdemDoIndicador[],
  de: string,
  ate: string,
) {
  const concluidas = ordens.filter((o) => o.status === StatusOrdem.CONCLUIDA);
  const agrupamento = agrupamentoDoPeriodo(de, ate);
  const chave = (o: OrdemDoIndicador) =>
    agrupamento === 'dia' ? o.dataColeta : o.dataColeta.slice(0, 7);

  const pesoPorPeriodo = periodosEntre(de, ate, agrupamento).map((periodo) => {
    const doPeriodo = concluidas.filter((o) => chave(o) === periodo);
    return {
      periodo,
      pesoKg: somarKg(doPeriodo.map((o) => o.pesoRealKg)),
      coletas: doPeriodo.length,
    };
  });

  const porCliente = new Map<number, OrdemDoIndicador[]>();
  for (const o of ordens.filter((o) => o.status !== StatusOrdem.CANCELADA)) {
    porCliente.set(o.clienteId, [...(porCliente.get(o.clienteId) ?? []), o]);
  }
  const clientes = [...porCliente.values()]
    .map((doCliente) => ({
      clienteId: doCliente[0].clienteId,
      cliente: doCliente[0].cliente.nome,
      coletas: doCliente.length,
      pesoKg: somarKg(
        doCliente
          .filter((o) => o.status === StatusOrdem.CONCLUIDA)
          .map((o) => o.pesoRealKg),
      ),
    }))
    .sort((a, b) => b.coletas - a.coletas || b.pesoKg - a.pesoKg)
    .slice(0, 10);

  const porMotorista = new Map<number, OrdemDoIndicador[]>();
  for (const o of ordens) {
    if (o.motoristaId === null || !o.motorista) continue;
    porMotorista.set(o.motoristaId, [
      ...(porMotorista.get(o.motoristaId) ?? []),
      o,
    ]);
  }
  const motoristas = [...porMotorista.values()]
    .map((doMotorista) => {
      const feitas = doMotorista.filter(
        (o) => o.status === StatusOrdem.CONCLUIDA,
      );
      return {
        motoristaId: doMotorista[0].motoristaId as number,
        motorista: doMotorista[0].motorista?.nome ?? '',
        coletas: feitas.length,
        falhas: doMotorista.filter((o) => o.status === StatusOrdem.FALHA)
          .length,
        distanciaMetros: doMotorista.reduce(
          (total, o) => total + (o.distanciaMetros ?? 0),
          0,
        ),
        pesoKg: somarKg(feitas.map((o) => o.pesoRealKg)),
        duracaoMediaSegundos: media(duracoes(feitas)),
      };
    })
    .sort(
      (a, b) => b.coletas - a.coletas || b.distanciaMetros - a.distanciaMetros,
    );

  return {
    de,
    ate,
    agrupamento,
    totais: {
      coletas: ordens.length,
      concluidas: concluidas.length,
      falhas: ordens.filter((o) => o.status === StatusOrdem.FALHA).length,
      canceladas: ordens.filter((o) => o.status === StatusOrdem.CANCELADA)
        .length,
      pesoKg: somarKg(concluidas.map((o) => o.pesoRealKg)),
      semPesagem: concluidas.filter((o) => o.pesoRealKg === null).length,
      distanciaMetros: ordens.reduce(
        (total, o) => total + (o.distanciaMetros ?? 0),
        0,
      ),
      duracaoMediaSegundos: media(duracoes(concluidas)),
    },
    pesoPorPeriodo,
    clientes,
    motoristas,
  };
}

// Uma linha da planilha de coletas (RF15).
export function linhaDoRelatorio(ordem: OrdemDoRelatorio) {
  const { inicio, fim } = periodoDaCorrida(ordem.historico);
  const encerramento = ordem.historico.findLast(
    (h) =>
      h.statusNovo === StatusOrdem.FALHA ||
      h.statusNovo === StatusOrdem.CANCELADA,
  );
  return {
    id: ordem.id,
    dataColeta: ordem.dataColeta,
    cliente: ordem.cliente.nome,
    enderecoColeta: ordem.enderecoColeta,
    motorista: ordem.motorista?.nome ?? null,
    placa: ordem.veiculo?.placa ?? null,
    status: ordem.status,
    pesoEstimadoKg: ordem.pesoEstimadoKg,
    pesoRealKg: ordem.pesoRealKg,
    distanciaMetros: ordem.distanciaMetros,
    duracaoSegundos: ordem.duracaoSegundos,
    inicio,
    fim,
    motivo: encerramento?.motivo ?? null,
  };
}
