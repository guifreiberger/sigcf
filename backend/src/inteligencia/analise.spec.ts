import {
  analisarPeso,
  avaliarAlerta,
  classificarRecorrencia,
  diasEntre,
  preverProxima,
  type Recorrencia,
} from './analise.js';

const mensalDia = (diaDoMes: number): Recorrencia => ({
  tipo: 'MENSAL',
  descricao: '',
  intervaloMedioDias: 30,
  regularidade: 1,
  diaDoMes,
});

describe('análise de clientes', () => {
  describe('classificarRecorrencia', () => {
    it('exige ao menos três coletas para apontar um padrão', () => {
      const r = classificarRecorrencia(['2026-01-05', '2026-02-05']);
      expect(r.tipo).toBe('INSUFICIENTE');
      expect(preverProxima(r, '2026-02-05')).toBeNull();
    });

    it('identifica coleta mensal no mesmo dia, tolerando um dia de diferença', () => {
      const r = classificarRecorrencia([
        '2026-01-05',
        '2026-02-04',
        '2026-03-06',
        '2026-04-05',
        '2026-05-05',
        '2026-06-05',
      ]);
      expect(r).toMatchObject({
        tipo: 'MENSAL',
        diaDoMes: 5,
        regularidade: 1,
        descricao: 'Todo mês, por volta do dia 5',
      });
      expect(preverProxima(r, '2026-06-05')).toBe('2026-07-05');
    });

    it('não inventa padrão mensal quando o dia do mês varia muito', () => {
      const r = classificarRecorrencia([
        '2026-01-03',
        '2026-02-10',
        '2026-03-05',
        '2026-04-20',
        '2026-05-12',
      ]);
      expect(r.tipo).toBe('INTERVALO');
    });

    it('identifica coleta semanal no mesmo dia da semana', () => {
      const segundas = [
        '2026-06-01',
        '2026-06-08',
        '2026-06-15',
        '2026-06-22',
        '2026-06-29',
        '2026-07-06',
      ];
      const r = classificarRecorrencia(segundas);
      expect(r).toMatchObject({
        tipo: 'SEMANAL',
        diaDaSemana: 1,
        regularidade: 1,
        descricao: 'Toda segunda-feira',
      });
      expect(preverProxima(r, '2026-07-06')).toBe('2026-07-13');
    });

    it('concorda o artigo com sábado e domingo', () => {
      const sabados = ['2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27'];
      expect(classificarRecorrencia(sabados).descricao).toBe('Todo sábado');
    });

    it('identifica coleta quinzenal', () => {
      const quartas = [
        '2026-06-03',
        '2026-06-17',
        '2026-07-01',
        '2026-07-15',
        '2026-07-29',
      ];
      const r = classificarRecorrencia(quartas);
      expect(r).toMatchObject({
        tipo: 'QUINZENAL',
        descricao: 'A cada duas semanas, geralmente na quarta-feira',
      });
      expect(preverProxima(r, '2026-07-29')).toBe('2026-08-12');
    });

    it('usa o intervalo médio quando não há dia fixo', () => {
      const r = classificarRecorrencia([
        '2026-01-01',
        '2026-01-19',
        '2026-02-10',
        '2026-03-02',
        '2026-03-27',
      ]);
      expect(r.tipo).toBe('INTERVALO');
      expect(r.descricao).toBe('A cada 21 dias, em média');
      expect(r.regularidade).toBeGreaterThan(0);
      expect(r.regularidade).toBeLessThan(1);
      expect(preverProxima(r, '2026-03-27')).toBe('2026-04-17');
    });

    it('ignora duas ordens no mesmo dia', () => {
      const r = classificarRecorrencia([
        '2026-06-01',
        '2026-06-08',
        '2026-06-08',
        '2026-06-15',
        '2026-06-22',
      ]);
      expect(r).toMatchObject({ tipo: 'SEMANAL', intervaloMedioDias: 7 });
    });
  });

  describe('preverProxima para padrão mensal', () => {
    it('ajusta para o último dia em meses mais curtos', () => {
      expect(preverProxima(mensalDia(31), '2026-01-31')).toBe('2026-02-28');
    });

    it('passa corretamente para o ano seguinte', () => {
      expect(preverProxima(mensalDia(5), '2026-12-05')).toBe('2027-01-05');
    });
  });

  describe('avaliarAlerta', () => {
    const hoje = '2026-06-10';

    it('não alerta quando já existe coleta agendada', () => {
      expect(avaliarAlerta('2026-06-05', hoje, true)).toBeNull();
    });

    it('não alerta sem previsão', () => {
      expect(avaliarAlerta(null, hoje, false)).toBeNull();
    });

    it('marca como atrasada após a tolerância de dois dias', () => {
      expect(avaliarAlerta('2026-06-05', hoje, false)).toBe('ATRASADA');
    });

    it('marca como prevista dentro da tolerância e dos próximos três dias', () => {
      expect(avaliarAlerta('2026-06-09', hoje, false)).toBe('PREVISTA');
      expect(avaliarAlerta('2026-06-13', hoje, false)).toBe('PREVISTA');
    });

    it('não alerta coletas previstas mais adiante', () => {
      expect(avaliarAlerta('2026-06-20', hoje, false)).toBeNull();
    });
  });

  describe('analisarPeso', () => {
    const mensal = (kgs: number[]) =>
      kgs.map((kg, i) => ({
        data: `2026-${String(i + 1).padStart(2, '0')}-05`,
        kg,
      }));

    it('retorna vazio sem amostras', () => {
      expect(analisarPeso([])).toMatchObject({
        mediaKg: null,
        amostras: 0,
        tendencia: 'INSUFICIENTE',
      });
    });

    it('calcula a média mas não aponta tendência com poucas amostras', () => {
      expect(analisarPeso(mensal([100, 200, 300]))).toMatchObject({
        mediaKg: 200,
        tendencia: 'INSUFICIENTE',
        variacaoMensalPct: null,
      });
    });

    it('identifica tendência de alta', () => {
      const r = analisarPeso(mensal([1000, 1100, 1200, 1300, 1400, 1500]));
      expect(r.tendencia).toBe('ALTA');
      expect(r.mediaKg).toBe(1250);
      expect(r.variacaoMensalPct).toBeGreaterThan(5);
      expect(r.r2).toBeGreaterThan(0.9);
    });

    it('identifica tendência de queda', () => {
      const r = analisarPeso(mensal([1500, 1400, 1300, 1200, 1100, 1000]));
      expect(r.tendencia).toBe('QUEDA');
      expect(r.variacaoMensalPct).toBeLessThan(-5);
    });

    it('considera estável quando o volume só oscila', () => {
      expect(
        analisarPeso(mensal([500, 520, 480, 510, 490, 500])).tendencia,
      ).toBe('ESTAVEL');
    });

    it('considera estável um crescimento pequeno demais', () => {
      expect(analisarPeso(mensal([1000, 1010, 1020, 1030])).tendencia).toBe(
        'ESTAVEL',
      );
    });

    it('não calcula tendência quando todas as amostras são do mesmo dia', () => {
      const mesmoDia = [300, 310, 290, 305].map((kg) => ({
        data: '2026-06-01',
        kg,
      }));
      expect(analisarPeso(mesmoDia).tendencia).toBe('INSUFICIENTE');
    });
  });

  it('diasEntre conta a diferença em dias corridos', () => {
    expect(diasEntre('2026-02-27', '2026-03-02')).toBe(3);
    expect(diasEntre('2026-03-02', '2026-02-27')).toBe(-3);
  });
});
