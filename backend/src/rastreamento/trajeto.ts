import { StatusOrdem } from '../ordens/status-ordem.enum.js';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface LeituraGps extends Coordenada {
  precisaoMetros: number | null;
  registradoEm: Date;
}

interface PassoDoHistorico {
  statusAnterior: StatusOrdem | null;
  statusNovo: StatusOrdem;
  createdAt: Date;
}

const RAIO_DA_TERRA_METROS = 6_371_000;

// Leituras piores que isso costumam vir de antena de celular ou Wi-Fi, não do GPS.
export const PRECISAO_MAXIMA_METROS = 100;

// Com o caminhão parado, o GPS oscila alguns metros a cada leitura; trechos menores
// que isso (ou que a precisão da própria leitura) não contam como deslocamento.
export const DESLOCAMENTO_MINIMO_METROS = 15;

const radianos = (graus: number) => (graus * Math.PI) / 180;

// Fórmula de haversine: distância sobre a superfície da Terra, em metros.
export function distanciaEntre(a: Coordenada, b: Coordenada): number {
  const dLat = radianos(b.latitude - a.latitude);
  const dLon = radianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radianos(a.latitude)) *
      Math.cos(radianos(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_DA_TERRA_METROS * Math.asin(Math.sqrt(h));
}

export function pontosConfiaveis<T extends LeituraGps>(pontos: T[]): T[] {
  return pontos
    .filter(
      (p) =>
        p.precisaoMetros === null || p.precisaoMetros <= PRECISAO_MAXIMA_METROS,
    )
    .sort((a, b) => a.registradoEm.getTime() - b.registradoEm.getTime());
}

// Espera os pontos já filtrados e ordenados por pontosConfiaveis.
export function distanciaPercorrida(pontos: LeituraGps[]): number {
  if (pontos.length < 2) return 0;
  let total = 0;
  let referencia = pontos[0];
  for (const ponto of pontos.slice(1)) {
    const trecho = distanciaEntre(referencia, ponto);
    const minimo = Math.max(
      DESLOCAMENTO_MINIMO_METROS,
      ponto.precisaoMetros ?? 0,
    );
    if (trecho >= minimo) {
      total += trecho;
      referencia = ponto;
    }
  }
  return Math.round(total);
}

// A corrida começa quando o motorista inicia a coleta e termina quando ela sai de
// "em andamento" (concluída, com falha ou cancelada pelo gestor).
export function periodoDaCorrida(historico: PassoDoHistorico[]) {
  const inicio =
    historico.find((h) => h.statusNovo === StatusOrdem.EM_ANDAMENTO)
      ?.createdAt ?? null;
  // Uma edição durante a coleta fica no histórico de EM_ANDAMENTO para EM_ANDAMENTO
  // e não encerra a corrida.
  const fim =
    historico.find(
      (h) =>
        h.statusAnterior === StatusOrdem.EM_ANDAMENTO &&
        h.statusNovo !== StatusOrdem.EM_ANDAMENTO,
    )?.createdAt ?? null;
  return { inicio, fim };
}

export interface Corrida {
  ordemId: number;
  inicio: Date;
  // Nula enquanto a coleta está em andamento.
  fim: Date | null;
}

// O relógio do celular e o do servidor diferem alguns segundos, e a primeira leitura pode ser
// de pouco antes do toque em "Iniciar".
export const TOLERANCIA_DA_CORRIDA_MS = 60_000;

// A leitura pertence à corrida em andamento no momento em que foi feita, e não à que estiver em
// andamento quando ela chega ao servidor: sem internet, o celular guarda as leituras e só as
// envia depois, às vezes com a coleta já concluída e outra iniciada.
export function corridasDaLeitura(
  registradoEm: Date,
  corridas: Corrida[],
): number[] {
  const momento = registradoEm.getTime();
  const fimDe = (c: Corrida) => c.fim?.getTime() ?? Infinity;
  const dentro = corridas.filter(
    (c) => c.inicio.getTime() <= momento && momento <= fimDe(c),
  );
  if (dentro.length) return dentro.map((c) => c.ordemId);

  const afastamento = (c: Corrida) =>
    Math.max(c.inicio.getTime() - momento, momento - fimDe(c));
  const proxima = corridas
    .filter((c) => afastamento(c) <= TOLERANCIA_DA_CORRIDA_MS)
    .sort((a, b) => afastamento(a) - afastamento(b))[0];
  return proxima ? [proxima.ordemId] : [];
}

export function duracaoEmSegundos(
  inicio: Date | null,
  fim: Date | null,
  agora: Date,
): number | null {
  if (!inicio) return null;
  return Math.round(((fim ?? agora).getTime() - inicio.getTime()) / 1000);
}

export function resumirTrajeto<T extends LeituraGps>(
  pontos: T[],
  inicio: Date | null,
  fim: Date | null,
  agora: Date,
) {
  const confiaveis = pontosConfiaveis(pontos);
  return {
    distanciaMetros: distanciaPercorrida(confiaveis),
    duracaoSegundos: duracaoEmSegundos(inicio, fim, agora),
    ultimaPosicao: confiaveis.at(-1) ?? null,
    pontos: confiaveis,
  };
}
