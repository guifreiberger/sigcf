import { resumirTrajeto } from './trajeto.js';

interface Banco {
  query(sql: string, parametros?: unknown[]): Promise<unknown>;
}

interface Corrida {
  id: number;
  inicio: Date | string | null;
  fim: Date | string | null;
}

interface PontoDoBanco {
  latitude: string | number;
  longitude: string | number;
  precisaoMetros: number | null;
  registradoEm: Date | string;
}

// Grava a distância e a duração das coletas que já terminaram e ainda não as têm. Novas
// coletas gravam isso ao finalizar; esta função cobre as antigas, na migration que criou as
// colunas, e os dados de demonstração do seed.
export async function consolidarCorridasAntigas(banco: Banco) {
  const corridas = (await banco.query(
    `SELECT o.id,
       (SELECT MIN(h.created_at) FROM historico_status h
         WHERE h.ordem_id = o.id AND h.status_novo = 'EM_ANDAMENTO') AS inicio,
       (SELECT MIN(h.created_at) FROM historico_status h
         WHERE h.ordem_id = o.id AND h.status_anterior = 'EM_ANDAMENTO'
           AND h.status_novo <> 'EM_ANDAMENTO') AS fim
     FROM ordem_coleta o
     WHERE o.status IN ('CONCLUIDA', 'FALHA', 'CANCELADA')
       AND o.distancia_metros IS NULL`,
  )) as Corrida[];

  let consolidadas = 0;
  for (const { id, inicio, fim } of corridas) {
    if (!inicio || !fim) continue;
    const linhas = (await banco.query(
      `SELECT latitude, longitude, precisao_metros AS precisaoMetros,
              registrado_em AS registradoEm
       FROM ponto_trajeto WHERE ordem_id = ?`,
      [id],
    )) as PontoDoBanco[];
    const pontos = linhas.map((p) => ({
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      precisaoMetros:
        p.precisaoMetros == null ? null : Number(p.precisaoMetros),
      registradoEm: new Date(p.registradoEm),
    }));
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
