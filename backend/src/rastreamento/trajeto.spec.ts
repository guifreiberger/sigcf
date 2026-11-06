import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import {
  corridasDaLeitura,
  distanciaEntre,
  distanciaPercorrida,
  duracaoEmSegundos,
  periodoDaCorrida,
  pontosConfiaveis,
  resumirTrajeto,
} from './trajeto.js';

const { AGUARDANDO, EM_ANDAMENTO, CONCLUIDA, CANCELADA } = StatusOrdem;

// Um milésimo de grau de latitude equivale a cerca de 111 metros.
const ponto = (
  milesimos: number,
  segundos: number,
  precisaoMetros: number | null = 10,
) => ({
  latitude: milesimos / 1000,
  longitude: 0,
  precisaoMetros,
  registradoEm: new Date(Date.UTC(2026, 10, 4, 12, 0, segundos)),
});

const quando = (minuto: number) => new Date(Date.UTC(2026, 10, 4, 12, minuto));

describe('trajeto da coleta (RF11)', () => {
  describe('distanciaEntre', () => {
    it('é zero para o mesmo ponto', () => {
      expect(distanciaEntre(ponto(5, 0), ponto(5, 0))).toBe(0);
    });

    it('mede um grau de latitude como cerca de 111 km', () => {
      const de = { latitude: 0, longitude: 0 };
      expect(
        Math.round(distanciaEntre(de, { latitude: 1, longitude: 0 })),
      ).toBe(111_195);
    });

    it('considera a curvatura da Terra na longitude', () => {
      // Em Jaraguá do Sul (26,5° S), um grau de longitude é mais curto que no equador.
      const de = { latitude: -26.5, longitude: -49 };
      const ate = { latitude: -26.5, longitude: -48 };
      expect(distanciaEntre(de, ate) / 1000).toBeCloseTo(99.5, 1);
    });
  });

  describe('pontosConfiaveis', () => {
    it('descarta leituras com precisão pior que 100 m', () => {
      const pontos = [ponto(0, 0, 8), ponto(1, 15, 450), ponto(2, 30, null)];

      expect(pontosConfiaveis(pontos)).toEqual([pontos[0], pontos[2]]);
    });

    it('ordena pelo momento da leitura, já que os lotes podem chegar fora de ordem', () => {
      const pontos = [ponto(2, 30), ponto(0, 0), ponto(1, 15)];

      expect(pontosConfiaveis(pontos).map((p) => p.latitude)).toEqual([
        0, 0.001, 0.002,
      ]);
    });
  });

  describe('distanciaPercorrida', () => {
    it('soma os trechos do caminho', () => {
      const pontos = [ponto(0, 0), ponto(1, 15), ponto(2, 30), ponto(4, 45)];

      expect(distanciaPercorrida(pontos)).toBe(445);
    });

    it('ignora a oscilação do GPS com o caminhão parado', () => {
      const parado = [0, 0.05, -0.04, 0.06, -0.05, 0.03].map((m, i) =>
        ponto(m, i * 15),
      );

      expect(distanciaPercorrida(parado)).toBe(0);
    });

    it('não conta deslocamentos menores que a precisão da leitura', () => {
      // 0,3 milésimo ≈ 33 m, dentro da margem de 50 m da segunda leitura.
      expect(distanciaPercorrida([ponto(0, 0), ponto(0.3, 15, 50)])).toBe(0);
    });

    it('é zero com menos de dois pontos', () => {
      expect(distanciaPercorrida([])).toBe(0);
      expect(distanciaPercorrida([ponto(0, 0)])).toBe(0);
    });
  });

  describe('periodoDaCorrida', () => {
    const historico = (
      ...passos: [StatusOrdem | null, StatusOrdem, number][]
    ) =>
      passos.map(([statusAnterior, statusNovo, minuto]) => ({
        statusAnterior,
        statusNovo,
        createdAt: quando(minuto),
      }));

    it('vai do início da coleta até a conclusão', () => {
      expect(
        periodoDaCorrida(
          historico(
            [null, AGUARDANDO, 0],
            [AGUARDANDO, EM_ANDAMENTO, 10],
            [EM_ANDAMENTO, CONCLUIDA, 52],
          ),
        ),
      ).toEqual({ inicio: quando(10), fim: quando(52) });
    });

    it('termina também no cancelamento durante a coleta', () => {
      expect(
        periodoDaCorrida(
          historico(
            [null, AGUARDANDO, 0],
            [AGUARDANDO, EM_ANDAMENTO, 10],
            [EM_ANDAMENTO, CANCELADA, 20],
          ),
        ),
      ).toEqual({ inicio: quando(10), fim: quando(20) });
    });

    it('não encerra a corrida quando o gestor edita as observações durante a coleta', () => {
      expect(
        periodoDaCorrida(
          historico(
            [null, AGUARDANDO, 0],
            [AGUARDANDO, EM_ANDAMENTO, 10],
            [EM_ANDAMENTO, EM_ANDAMENTO, 15],
            [EM_ANDAMENTO, CONCLUIDA, 52],
          ),
        ),
      ).toEqual({ inicio: quando(10), fim: quando(52) });
    });

    it('fica sem fim enquanto a coleta está em andamento', () => {
      expect(
        periodoDaCorrida(
          historico([null, AGUARDANDO, 0], [AGUARDANDO, EM_ANDAMENTO, 10]),
        ),
      ).toEqual({ inicio: quando(10), fim: null });
    });

    it('não existe corrida quando a ordem foi cancelada antes de começar', () => {
      expect(
        periodoDaCorrida(
          historico([null, AGUARDANDO, 0], [AGUARDANDO, CANCELADA, 5]),
        ),
      ).toEqual({ inicio: null, fim: null });
    });
  });

  describe('duracaoEmSegundos', () => {
    it('mede do início ao fim da corrida', () => {
      expect(duracaoEmSegundos(quando(10), quando(52), quando(90))).toBe(2520);
    });

    it('conta até agora enquanto a coleta está em andamento', () => {
      expect(duracaoEmSegundos(quando(10), null, quando(25))).toBe(900);
    });

    it('não existe sem início', () => {
      expect(duracaoEmSegundos(null, null, quando(25))).toBeNull();
    });
  });

  it('resumirTrajeto junta os pontos confiáveis, a distância, a duração e a última posição', () => {
    const pontos = [ponto(2, 30), ponto(0, 0), ponto(1, 15), ponto(9, 40, 800)];

    expect(resumirTrajeto(pontos, quando(0), null, quando(5))).toEqual({
      distanciaMetros: 222,
      duracaoSegundos: 300,
      ultimaPosicao: pontos[0],
      pontos: [pontos[1], pontos[2], pontos[0]],
    });
  });

  describe('corridasDaLeitura', () => {
    const corrida = (ordemId: number, inicio: number, fim: number | null) => ({
      ordemId,
      inicio: quando(inicio),
      fim: fim === null ? null : quando(fim),
    });
    const aos = (minuto: number, segundo = 0) =>
      new Date(Date.UTC(2026, 10, 4, 12, minuto, segundo));

    it('leva a leitura para a corrida em que ela foi feita, já concluída ou não', () => {
      const corridas = [corrida(14, 15, 24), corrida(16, 25, null)];

      expect(corridasDaLeitura(aos(20), corridas)).toEqual([14]);
      expect(corridasDaLeitura(aos(30), corridas)).toEqual([16]);
    });

    it('aceita a leitura feita logo antes do início ou logo depois do fim, pela diferença dos relógios', () => {
      const corridas = [corrida(14, 15, 24)];

      expect(corridasDaLeitura(aos(14, 30), corridas)).toEqual([14]);
      expect(corridasDaLeitura(aos(24, 40), corridas)).toEqual([14]);
    });

    it('descarta a leitura de fora de qualquer corrida', () => {
      const corridas = [corrida(14, 15, 24)];

      expect(corridasDaLeitura(aos(10), corridas)).toEqual([]);
      expect(corridasDaLeitura(aos(30), corridas)).toEqual([]);
      expect(corridasDaLeitura(aos(20), [])).toEqual([]);
    });

    it('entre duas corridas seguidas, fica com a mais próxima', () => {
      const corridas = [corrida(14, 15, 24), corrida(16, 25, null)];

      expect(corridasDaLeitura(aos(24, 10), corridas)).toEqual([14]);
      expect(corridasDaLeitura(aos(24, 50), corridas)).toEqual([16]);
    });

    it('vale para todas as corridas em andamento ao mesmo tempo', () => {
      const corridas = [corrida(10, 15, null), corrida(11, 18, null)];

      expect(corridasDaLeitura(aos(20), corridas)).toEqual([10, 11]);
    });
  });
});
