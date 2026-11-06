import { consolidarCorridasAntigas } from './consolidar-corridas.js';

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
