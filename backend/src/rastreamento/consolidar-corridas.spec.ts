import {
  consolidarCorridasAntigas,
  reatribuirPontosPeloHorario,
  recalcularDistancias,
} from './consolidar-corridas.js';

// Banco falso: responde às consultas da função e guarda os UPDATEs.
function bancoFalso(
  corridas: object[],
  pontosPorOrdem: Record<number, object[]>,
) {
  const atualizacoes: unknown[][] = [];
  const query = vi.fn(async (sql: string, parametros: unknown[] = []) => {
    if (sql.includes('FROM ordem_coleta')) return corridas;
    if (sql.includes('FROM ponto_trajeto'))
      return pontosPorOrdem[parametros[0] as number] ?? [];
    if (sql.startsWith('UPDATE')) atualizacoes.push(parametros);
    return [];
  });
  return { banco: { query }, atualizacoes };
}

describe('consolidarCorridasAntigas', () => {
  it('grava distância e duração das coletas finalizadas a partir dos pontos e do histórico', async () => {
    const { banco, atualizacoes } = bancoFalso(
      [
        {
          id: 3,
          inicio: '2026-11-04T14:30:00.000Z',
          fim: '2026-11-04T15:00:00.000Z',
        },
      ],
      {
        // Como vêm do MySQL: decimais em texto e datas como Date.
        3: [
          {
            latitude: '-26.485100',
            longitude: '-49.070000',
            precisaoMetros: 8,
            registradoEm: new Date('2026-11-04T14:31:00.000Z'),
          },
          {
            latitude: '-26.484100',
            longitude: '-49.070000',
            precisaoMetros: null,
            registradoEm: new Date('2026-11-04T14:40:00.000Z'),
          },
        ],
      },
    );

    await expect(consolidarCorridasAntigas(banco)).resolves.toBe(1);

    expect(atualizacoes).toEqual([[111, 1800, 3]]);
  });

  it('ignora a coleta que não chegou a ser iniciada', async () => {
    const { banco, atualizacoes } = bancoFalso(
      [{ id: 4, inicio: null, fim: null }],
      {},
    );

    await expect(consolidarCorridasAntigas(banco)).resolves.toBe(0);
    expect(atualizacoes).toEqual([]);
  });

  it('grava distância zero quando a coleta não tem pontos de trajeto', async () => {
    const { banco, atualizacoes } = bancoFalso(
      [
        {
          id: 5,
          inicio: new Date('2026-11-04T10:00:00.000Z'),
          fim: new Date('2026-11-04T10:20:00.000Z'),
        },
      ],
      {},
    );

    await consolidarCorridasAntigas(banco);

    expect(atualizacoes).toEqual([[0, 1200, 5]]);
  });
});

describe('reatribuirPontosPeloHorario', () => {
  interface Ponto {
    id: number;
    ordemId: number;
    latitude: string;
    longitude: string;
    precisaoMetros: number | null;
    registradoEm: Date;
  }

  // Banco falso com os pontos em memória: aplica as mudanças de coleta e guarda as distâncias.
  function bancoComPontos(corridas: object[], pontos: Ponto[]) {
    const distancias: [number, number][] = [];
    const query = vi.fn(async (sql: string, parametros: unknown[] = []) => {
      if (sql.includes('FROM ordem_coleta')) return corridas;
      if (sql.includes('FROM ponto_trajeto WHERE ordem_id = ?'))
        return pontos.filter((p) => p.ordemId === parametros[0]);
      if (sql.includes('FROM ponto_trajeto')) return pontos;
      if (sql.startsWith('UPDATE ponto_trajeto')) {
        const [destino, ...ids] = parametros as number[];
        for (const p of pontos) if (ids.includes(p.id)) p.ordemId = destino;
      }
      if (sql.startsWith('UPDATE ordem_coleta'))
        distancias.push(parametros as [number, number]);
      return [];
    });
    return { banco: { query }, pontos, distancias };
  }

  const as = (hora: string) => new Date(`2026-11-06T${hora}Z`);
  // Um milésimo de grau de latitude equivale a cerca de 111 metros.
  const ponto = (id: number, ordemId: number, hora: string, milesimos = 0) => ({
    id,
    ordemId,
    latitude: (-26.48 + milesimos / 1000).toFixed(6),
    longitude: '-49.070000',
    precisaoMetros: 8,
    registradoEm: as(hora),
  });
  const corrida = (
    id: number,
    motoristaId: number,
    inicio: string,
    fim: string | null,
  ) => ({ id, motoristaId, inicio: as(inicio), fim: fim && as(fim) });

  // Caso do teste de campo: as leituras da manhã ficaram no celular e só chegaram na coleta
  // do meio-dia.
  const corridasDoDia = [
    corrida(114, 7, '11:15:56', '11:24:08'),
    corrida(116, 7, '11:24:10', '11:29:04'),
    corrida(121, 7, '15:18:37', '15:29:02'),
  ];

  it('devolve cada ponto à coleta em que foi lido e recalcula a distância das coletas afetadas', async () => {
    const { banco, pontos, distancias } = bancoComPontos(corridasDoDia, [
      ponto(1, 114, '11:16:00', 0),
      ponto(2, 121, '11:20:00', 1),
      ponto(3, 121, '11:25:00', 2),
      ponto(4, 121, '15:20:00', 5),
    ]);

    await expect(reatribuirPontosPeloHorario(banco)).resolves.toBe(2);

    expect(pontos.map((p) => p.ordemId)).toEqual([114, 114, 116, 121]);
    expect(distancias.sort(([, a], [, b]) => a - b)).toEqual([
      [111, 114],
      [0, 116],
      [0, 121],
    ]);
  });

  it('não leva o ponto para a coleta de outro motorista', async () => {
    const { banco, pontos, distancias } = bancoComPontos(
      [...corridasDoDia, corrida(200, 8, '11:00:00', '11:40:00')],
      [ponto(1, 121, '11:10:00')],
    );

    await expect(reatribuirPontosPeloHorario(banco)).resolves.toBe(0);
    expect(pontos[0].ordemId).toBe(121);
    expect(distancias).toEqual([]);
  });

  it('mantém onde está o ponto que não cabe em nenhuma coleta, sem apagar nada', async () => {
    const { banco, pontos } = bancoComPontos(corridasDoDia, [
      ponto(1, 121, '09:00:00'),
    ]);

    await expect(reatribuirPontosPeloHorario(banco)).resolves.toBe(0);
    expect(pontos[0].ordemId).toBe(121);
    expect(banco.query).not.toHaveBeenCalledWith(
      expect.stringMatching(/^(UPDATE|DELETE)/),
      expect.anything(),
    );
  });

  it('não grava distância de coleta ainda em andamento', async () => {
    const { banco, pontos, distancias } = bancoComPontos(
      [
        corrida(114, 7, '11:15:56', '11:24:08'),
        corrida(121, 7, '15:18:37', null),
      ],
      [ponto(1, 121, '11:20:00')],
    );

    await expect(reatribuirPontosPeloHorario(banco)).resolves.toBe(1);
    expect(pontos[0].ordemId).toBe(114);
    expect(distancias).toEqual([[0, 114]]);
  });

  it('ignora coletas que não chegaram a ser iniciadas', async () => {
    const { banco, pontos } = bancoComPontos(
      [{ id: 130, motoristaId: 7, inicio: null, fim: null }, ...corridasDoDia],
      [ponto(1, 116, '11:25:00')],
    );

    await expect(reatribuirPontosPeloHorario(banco)).resolves.toBe(0);
    expect(pontos[0].ordemId).toBe(116);
  });
});

describe('recalcularDistancias', () => {
  // Um milésimo de grau de latitude equivale a cerca de 111 metros.
  const leitura = (milesimos: number, segundos: number) => ({
    latitude: (-26.48 + milesimos / 1000).toFixed(6),
    longitude: '-49.070000',
    precisaoMetros: 8,
    registradoEm: new Date(Date.UTC(2026, 10, 6, 11, 20, segundos)),
  });

  it('regrava só a distância que mudou com as regras do trajeto, como o descarte de saltos do GPS', async () => {
    const atualizacoes: unknown[][] = [];
    const pontosPorOrdem: Record<number, object[]> = {
      // Com um salto de 900 m que vai e volta em 24 s.
      114: [leitura(0, 0), leitura(1, 12), leitura(9, 24), leitura(2, 36)],
      115: [leitura(0, 0), leitura(1, 12)],
    };
    const banco = {
      query: vi.fn(async (sql: string, parametros: unknown[] = []) => {
        if (sql.includes('FROM ordem_coleta'))
          return [
            { id: 114, distanciaMetros: 1999 },
            { id: 115, distanciaMetros: 111 },
          ];
        if (sql.includes('FROM ponto_trajeto'))
          return pontosPorOrdem[parametros[0] as number] ?? [];
        if (sql.startsWith('UPDATE')) atualizacoes.push(parametros);
        return [];
      }),
    };

    await expect(recalcularDistancias(banco)).resolves.toBe(1);

    expect(atualizacoes).toEqual([[222, 114]]);
  });
});
