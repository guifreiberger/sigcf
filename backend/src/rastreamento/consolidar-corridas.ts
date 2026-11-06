import {
  type Corrida,
  corridasDaLeitura,
  distanciaPercorrida,
  pontosConfiaveis,
  resumirTrajeto,
} from './trajeto.js';

interface Banco {
  query(sql: string, parametros?: unknown[]): Promise<unknown>;
}

interface CorridaDoBanco {
  id: number;
  motoristaId?: number;
  inicio: Date | string | null;
  fim: Date | string | null;
}

interface PontoDoBanco {
  latitude: string | number;
  longitude: string | number;
  precisaoMetros: number | null;
  registradoEm: Date | string;
}

interface PosicaoDoPonto {
  id: number;
  ordemId: number;
  registradoEm: Date | string;
}

// Início e fim da corrida de cada ordem, pelo histórico de status (como em periodoDaCorrida).
const INICIO_E_FIM_DA_CORRIDA = `
  (SELECT MIN(h.created_at) FROM historico_status h
    WHERE h.ordem_id = o.id AND h.status_novo = 'EM_ANDAMENTO') AS inicio,
  (SELECT MIN(h.created_at) FROM historico_status h
    WHERE h.ordem_id = o.id AND h.status_anterior = 'EM_ANDAMENTO'
      AND h.status_novo <> 'EM_ANDAMENTO') AS fim`;

const IDS_POR_COMANDO = 500;

// Os pontos de uma ordem como vêm do MySQL: decimais em texto e datas como Date.
async function pontosDaOrdem(banco: Banco, ordemId: number) {
  const linhas = (await banco.query(
    `SELECT latitude, longitude, precisao_metros AS precisaoMetros,
            registrado_em AS registradoEm
     FROM ponto_trajeto WHERE ordem_id = ?`,
    [ordemId],
  )) as PontoDoBanco[];
  return linhas.map((p) => ({
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    precisaoMetros: p.precisaoMetros == null ? null : Number(p.precisaoMetros),
    registradoEm: new Date(p.registradoEm),
  }));
}

// Grava a distância e a duração das coletas que já terminaram e ainda não as têm. Novas
// coletas gravam isso ao finalizar; esta função cobre as antigas, na migration que criou as
// colunas, e os dados de demonstração do seed.
export async function consolidarCorridasAntigas(banco: Banco) {
  const corridas = (await banco.query(
    `SELECT o.id, ${INICIO_E_FIM_DA_CORRIDA}
     FROM ordem_coleta o
     WHERE o.status IN ('CONCLUIDA', 'FALHA', 'CANCELADA')
       AND o.distancia_metros IS NULL`,
  )) as CorridaDoBanco[];

  let consolidadas = 0;
  for (const { id, inicio, fim } of corridas) {
    if (!inicio || !fim) continue;
    const pontos = await pontosDaOrdem(banco, id);
    const termino = new Date(fim);
    const { distanciaMetros, duracaoSegundos } = resumirTrajeto(
      pontos,
      new Date(inicio),
      termino,
      termino,
    );
    await banco.query(
      'UPDATE ordem_coleta SET distancia_metros = ?, duracao_segundos = ? WHERE id = ?',
      [distanciaMetros, duracaoSegundos, id],
    );
    consolidadas++;
  }
  return consolidadas;
}

// Antes de o servidor usar o horário da leitura, cada lote de pontos ia para a coleta em
// andamento na hora da chegada, e leituras guardadas no celular sem internet caíram na coleta
// seguinte. Esta função devolve cada ponto à coleta do mesmo motorista que estava em andamento
// no horário da leitura e recalcula a distância das coletas terminadas que mudaram. Pontos que
// não cabem em nenhuma coleta ficam onde estão: nada é apagado.
export async function reatribuirPontosPeloHorario(banco: Banco) {
  const linhas = (await banco.query(
    `SELECT o.id, o.motorista_id AS motoristaId, ${INICIO_E_FIM_DA_CORRIDA}
     FROM ordem_coleta o
     WHERE o.motorista_id IS NOT NULL`,
  )) as CorridaDoBanco[];

  const corridaDaOrdem = new Map<number, Corrida & { motoristaId: number }>();
  const corridasDoMotorista = new Map<number, Corrida[]>();
  for (const { id, motoristaId, inicio, fim } of linhas) {
    if (!inicio || motoristaId == null) continue;
    const corrida = {
      ordemId: id,
      motoristaId,
      inicio: new Date(inicio),
      fim: fim ? new Date(fim) : null,
    };
    corridaDaOrdem.set(id, corrida);
    corridasDoMotorista.set(motoristaId, [
      ...(corridasDoMotorista.get(motoristaId) ?? []),
      corrida,
    ]);
  }

  const pontos = (await banco.query(
    `SELECT id, ordem_id AS ordemId, registrado_em AS registradoEm
     FROM ponto_trajeto`,
  )) as PosicaoDoPonto[];

  const idsPorDestino = new Map<number, number[]>();
  const afetadas = new Set<number>();
  for (const { id, ordemId, registradoEm } of pontos) {
    const atual = corridaDaOrdem.get(ordemId);
    if (!atual) continue;
    const destinos = corridasDaLeitura(
      new Date(registradoEm),
      corridasDoMotorista.get(atual.motoristaId) ?? [],
    );
    if (!destinos.length || destinos.includes(ordemId)) continue;
    idsPorDestino.set(destinos[0], [
      ...(idsPorDestino.get(destinos[0]) ?? []),
      id,
    ]);
    afetadas.add(ordemId).add(destinos[0]);
  }

  let movidos = 0;
  for (const [destino, ids] of idsPorDestino) {
    for (let i = 0; i < ids.length; i += IDS_POR_COMANDO) {
      const lote = ids.slice(i, i + IDS_POR_COMANDO);
      await banco.query(
        `UPDATE ponto_trajeto SET ordem_id = ? WHERE id IN (${lote.map(() => '?').join(', ')})`,
        [destino, ...lote],
      );
    }
    movidos += ids.length;
  }

  // Só a coleta terminada tem a distância gravada; a em andamento é calculada na hora.
  for (const ordemId of afetadas) {
    if (!corridaDaOrdem.get(ordemId)?.fim) continue;
    await banco.query(
      'UPDATE ordem_coleta SET distancia_metros = ? WHERE id = ?',
      [await distanciaDaOrdem(banco, ordemId), ordemId],
    );
  }
  return movidos;
}

// Regrava a distância das coletas terminadas quando as regras do trajeto mudam (como o descarte
// dos saltos do GPS), para o dashboard e o relatório mostrarem o valor certo.
export async function recalcularDistancias(banco: Banco) {
  const ordens = (await banco.query(
    `SELECT id, distancia_metros AS distanciaMetros
     FROM ordem_coleta WHERE distancia_metros IS NOT NULL`,
  )) as { id: number; distanciaMetros: number | string }[];

  let alteradas = 0;
  for (const { id, distanciaMetros } of ordens) {
    const distancia = await distanciaDaOrdem(banco, id);
    if (distancia === Number(distanciaMetros)) continue;
    await banco.query(
      'UPDATE ordem_coleta SET distancia_metros = ? WHERE id = ?',
      [distancia, id],
    );
    alteradas++;
  }
  return alteradas;
}

async function distanciaDaOrdem(banco: Banco, ordemId: number) {
  return distanciaPercorrida(
    pontosConfiaveis(await pontosDaOrdem(banco, ordemId)),
  );
}
