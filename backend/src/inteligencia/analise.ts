import { somarDias } from '../common/data.js';

export const MINIMO_OCORRENCIAS = 3;
export const MINIMO_PARA_TENDENCIA = 4;
const REGULARIDADE_MINIMA = 0.6;
const TOLERANCIA_DIA_DO_MES = 2;
const TOLERANCIA_ATRASO_DIAS = 2;
const ANTECEDENCIA_ALERTA_DIAS = 3;
const R2_MINIMO = 0.3;
const VARIACAO_MINIMA_PCT = 5;

const DIAS_DA_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

export type TipoRecorrencia =
  'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'INTERVALO' | 'INSUFICIENTE';

export interface Recorrencia {
  tipo: TipoRecorrencia;
  descricao: string;
  intervaloMedioDias: number | null;
  regularidade: number | null;
  diaDaSemana?: number;
  diaDoMes?: number;
}

export type TendenciaPeso = 'ALTA' | 'QUEDA' | 'ESTAVEL' | 'INSUFICIENTE';

export interface AnalisePeso {
  mediaKg: number | null;
  amostras: number;
  tendencia: TendenciaPeso;
  variacaoMensalPct: number | null;
  r2: number | null;
}

export type TipoAlerta = 'ATRASADA' | 'PREVISTA';

const paraData = (iso: string) => new Date(`${iso}T12:00:00Z`);
const paraIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const arredondar = (valor: number, casas: number) =>
  Math.round(valor * 10 ** casas) / 10 ** casas;
const media = (valores: number[]) =>
  valores.reduce((a, b) => a + b, 0) / valores.length;

export function diasEntre(de: string, ate: string) {
  return Math.round(
    (paraData(ate).getTime() - paraData(de).getTime()) / 86_400_000,
  );
}

function desvioPadrao(valores: number[]) {
  const m = media(valores);
  return Math.sqrt(media(valores.map((v) => (v - m) ** 2)));
}

function diaDaSemanaMaisComum(datas: string[]) {
  const contagem = new Map<number, number>();
  for (const d of datas) {
    const dia = paraData(d).getUTCDay();
    contagem.set(dia, (contagem.get(dia) ?? 0) + 1);
  }
  const [dia, vezes] = [...contagem].sort((a, b) => b[1] - a[1])[0];
  return { dia, frequencia: vezes / datas.length };
}

function diaDoMesMaisComum(datas: string[]) {
  const dias = datas.map((d) => paraData(d).getUTCDate());
  let melhor = { dia: dias[0], frequencia: 0, desvio: Infinity };
  for (let candidato = 1; candidato <= 31; candidato++) {
    const proximos = dias.filter(
      (d) => Math.abs(d - candidato) <= TOLERANCIA_DIA_DO_MES,
    );
    const frequencia = proximos.length / dias.length;
    const desvio = proximos.reduce((s, d) => s + Math.abs(d - candidato), 0);
    if (
      frequencia > melhor.frequencia ||
      (frequencia === melhor.frequencia && desvio < melhor.desvio)
    ) {
      melhor = { dia: candidato, frequencia, desvio };
    }
  }
  return melhor;
}

function comArtigo(diaDaSemana: number) {
  const nome = DIAS_DA_SEMANA[diaDaSemana];
  return diaDaSemana === 0 || diaDaSemana === 6 ? `no ${nome}` : `na ${nome}`;
}

export function classificarRecorrencia(datas: string[]): Recorrencia {
  const unicas = [...new Set(datas)].sort();
  if (unicas.length < MINIMO_OCORRENCIAS) {
    return {
      tipo: 'INSUFICIENTE',
      descricao: 'Histórico insuficiente para identificar um padrão',
      intervaloMedioDias: null,
      regularidade: null,
    };
  }

  const intervalos = unicas.slice(1).map((d, i) => diasEntre(unicas[i], d));
  const intervaloMedio = media(intervalos);
  const semana = diaDaSemanaMaisComum(unicas);
  const mes = diaDoMesMaisComum(unicas);
  const intervaloMedioDias = arredondar(intervaloMedio, 1);

  if (
    intervaloMedio >= 25 &&
    intervaloMedio <= 35 &&
    mes.frequencia >= REGULARIDADE_MINIMA
  ) {
    return {
      tipo: 'MENSAL',
      descricao: `Todo mês, por volta do dia ${mes.dia}`,
      intervaloMedioDias,
      regularidade: arredondar(mes.frequencia, 2),
      diaDoMes: mes.dia,
    };
  }
  if (
    intervaloMedio >= 5 &&
    intervaloMedio <= 9 &&
    semana.frequencia >= REGULARIDADE_MINIMA
  ) {
    const prefixo = semana.dia === 0 || semana.dia === 6 ? 'Todo' : 'Toda';
    return {
      tipo: 'SEMANAL',
      descricao: `${prefixo} ${DIAS_DA_SEMANA[semana.dia]}`,
      intervaloMedioDias,
      regularidade: arredondar(semana.frequencia, 2),
      diaDaSemana: semana.dia,
    };
  }
  if (
    intervaloMedio >= 12 &&
    intervaloMedio <= 17 &&
    semana.frequencia >= REGULARIDADE_MINIMA
  ) {
    return {
      tipo: 'QUINZENAL',
      descricao: `A cada duas semanas, geralmente ${comArtigo(semana.dia)}`,
      intervaloMedioDias,
      regularidade: arredondar(semana.frequencia, 2),
      diaDaSemana: semana.dia,
    };
  }

  const variacao = desvioPadrao(intervalos) / intervaloMedio;
  return {
    tipo: 'INTERVALO',
    descricao: `A cada ${Math.round(intervaloMedio)} dias, em média`,
    intervaloMedioDias,
    regularidade: arredondar(Math.min(1, Math.max(0, 1 - variacao)), 2),
  };
}

export function preverProxima(
  recorrencia: Recorrencia,
  ultimaColeta: string,
): string | null {
  switch (recorrencia.tipo) {
    case 'INSUFICIENTE':
      return null;
    case 'SEMANAL':
      return somarDias(ultimaColeta, 7);
    case 'QUINZENAL':
      return somarDias(ultimaColeta, 14);
    case 'INTERVALO':
      return somarDias(
        ultimaColeta,
        Math.round(recorrencia.intervaloMedioDias ?? 0),
      );
    case 'MENSAL': {
      const ultima = paraData(ultimaColeta);
      const ano = ultima.getUTCFullYear();
      const mes = ultima.getUTCMonth() + 1;
      const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
      const dia = Math.min(recorrencia.diaDoMes ?? 1, ultimoDiaDoMes);
      return paraIso(Date.UTC(ano, mes, dia, 12));
    }
  }
}

export function avaliarAlerta(
  dataPrevista: string | null,
  hoje: string,
  possuiColetaAgendada: boolean,
): TipoAlerta | null {
  if (!dataPrevista || possuiColetaAgendada) return null;
  const dias = diasEntre(hoje, dataPrevista);
  if (dias < -TOLERANCIA_ATRASO_DIAS) return 'ATRASADA';
  if (dias <= ANTECEDENCIA_ALERTA_DIAS) return 'PREVISTA';
  return null;
}

export function analisarPeso(
  amostras: { data: string; kg: number }[],
): AnalisePeso {
  if (amostras.length === 0) {
    return {
      mediaKg: null,
      amostras: 0,
      tendencia: 'INSUFICIENTE',
      variacaoMensalPct: null,
      r2: null,
    };
  }

  const ordenadas = [...amostras].sort((a, b) => a.data.localeCompare(b.data));
  const ys = ordenadas.map((a) => a.kg);
  const mediaKg = media(ys);
  const base = {
    mediaKg: arredondar(mediaKg, 1),
    amostras: ordenadas.length,
  };

  const xs = ordenadas.map((a) => diasEntre(ordenadas[0].data, a.data));
  const mediaX = media(xs);
  const somaXX = xs.reduce((s, x) => s + (x - mediaX) ** 2, 0);
  if (ordenadas.length < MINIMO_PARA_TENDENCIA || somaXX === 0) {
    return {
      ...base,
      tendencia: 'INSUFICIENTE',
      variacaoMensalPct: null,
      r2: null,
    };
  }

  // Regressão linear por mínimos quadrados: kg = intercepto + inclinacao * dias
  const somaXY = xs.reduce(
    (s, x, i) => s + (x - mediaX) * (ys[i] - mediaKg),
    0,
  );
  const inclinacao = somaXY / somaXX;
  const intercepto = mediaKg - inclinacao * mediaX;
  const somaTotal = ys.reduce((s, y) => s + (y - mediaKg) ** 2, 0);
  const somaResiduos = ys.reduce(
    (s, y, i) => s + (y - (intercepto + inclinacao * xs[i])) ** 2,
    0,
  );
  const r2 = somaTotal === 0 ? 0 : 1 - somaResiduos / somaTotal;
  const variacaoMensalPct = ((inclinacao * 30) / mediaKg) * 100;

  let tendencia: TendenciaPeso = 'ESTAVEL';
  if (r2 >= R2_MINIMO && variacaoMensalPct > VARIACAO_MINIMA_PCT) {
    tendencia = 'ALTA';
  } else if (r2 >= R2_MINIMO && variacaoMensalPct < -VARIACAO_MINIMA_PCT) {
    tendencia = 'QUEDA';
  }

  return {
    ...base,
    tendencia,
    variacaoMensalPct: arredondar(variacaoMensalPct, 1),
    r2: arredondar(r2, 2),
  };
}
