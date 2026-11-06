import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import {
  agrupamentoDoPeriodo,
  diasEntre,
  linhaDoRelatorio,
  periodosEntre,
  resumirDashboard,
} from './indicadores.js';

const { AGUARDANDO, EM_ANDAMENTO, CONCLUIDA, FALHA, CANCELADA } = StatusOrdem;

const weg = { nome: 'WEG' };
const malwee = { nome: 'Malwee' };
const joao = { nome: 'João' };
const maria = { nome: 'Maria' };

function ordem(dados: Record<string, unknown>) {
  return {
    id: 1,
    dataColeta: '2026-11-03',
    status: CONCLUIDA,
    clienteId: 3,
    cliente: weg,
    motoristaId: 7,
    motorista: joao,
    pesoRealKg: null,
    distanciaMetros: null,
    duracaoSegundos: null,
    ...dados,
  } as Parameters<typeof resumirDashboard>[0][number];
}

describe('indicadores do dashboard e do relatório', () => {
  describe('períodos', () => {
    it('conta os dias entre duas datas, incluindo as duas', () => {
      expect(diasEntre('2026-11-01', '2026-11-30')).toBe(30);
      expect(diasEntre('2026-11-03', '2026-11-03')).toBe(1);
    });

    it('agrupa por dia até dois meses e por mês acima disso', () => {
      expect(agrupamentoDoPeriodo('2026-09-05', '2026-11-05')).toBe('dia');
      expect(agrupamentoDoPeriodo('2025-11-06', '2026-11-05')).toBe('mes');
    });

    it('lista todos os dias ou meses do período, para o gráfico não pular os vazios', () => {
      expect(periodosEntre('2026-10-30', '2026-11-02', 'dia')).toEqual([
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
      ]);
      expect(periodosEntre('2025-12-15', '2026-02-10', 'mes')).toEqual([
        '2025-12',
        '2026-01',
        '2026-02',
      ]);
    });
  });

  describe('resumirDashboard', () => {
    const ordens = [
      ordem({
        id: 1,
        pesoRealKg: 1000,
        distanciaMetros: 12000,
        duracaoSegundos: 1800,
      }),
      ordem({
        id: 2,
        dataColeta: '2026-11-04',
        pesoRealKg: 500.5,
        distanciaMetros: 8000,
        duracaoSegundos: 1200,
      }),
      ordem({
        id: 3,
        clienteId: 5,
        cliente: malwee,
        motoristaId: 8,
        motorista: maria,
        pesoRealKg: null,
        distanciaMetros: 3000,
        duracaoSegundos: 600,
      }),
      ordem({
        id: 4,
        clienteId: 5,
        cliente: malwee,
        motoristaId: 8,
        motorista: maria,
        status: FALHA,
        distanciaMetros: 2000,
        duracaoSegundos: 900,
      }),
      ordem({ id: 5, status: CANCELADA, motoristaId: null, motorista: null }),
      ordem({ id: 6, status: AGUARDANDO }),
      ordem({ id: 7, status: EM_ANDAMENTO }),
    ];
    const resumo = resumirDashboard(ordens, '2026-11-03', '2026-11-04');

    it('soma as coletas, o peso da balança, a distância e o tempo médio do período', () => {
      expect(resumo.totais).toEqual({
        coletas: 7,
        concluidas: 3,
        falhas: 1,
        canceladas: 1,
        pesoKg: 1500.5,
        // Concluídas que ainda esperam o peso da balança.
        semPesagem: 1,
        distanciaMetros: 25000,
        duracaoMediaSegundos: 1200,
      });
    });

    it('mostra o peso coletado em cada dia do período', () => {
      expect(resumo.agrupamento).toBe('dia');
      expect(resumo.pesoPorPeriodo).toEqual([
        { periodo: '2026-11-03', pesoKg: 1000, coletas: 2 },
        { periodo: '2026-11-04', pesoKg: 500.5, coletas: 1 },
      ]);
    });

    it('ordena os clientes pelo número de coletas pedidas, sem contar as canceladas', () => {
      expect(resumo.clientes).toEqual([
        { clienteId: 3, cliente: 'WEG', coletas: 4, pesoKg: 1500.5 },
        { clienteId: 5, cliente: 'Malwee', coletas: 2, pesoKg: 0 },
      ]);
    });

    it('resume o trabalho de cada motorista: coletas, falhas, quilômetros, peso e tempo médio', () => {
      expect(resumo.motoristas).toEqual([
        {
          motoristaId: 7,
          motorista: 'João',
          coletas: 2,
          falhas: 0,
          distanciaMetros: 20000,
          pesoKg: 1500.5,
          duracaoMediaSegundos: 1500,
        },
        {
          motoristaId: 8,
          motorista: 'Maria',
          coletas: 1,
          falhas: 1,
          distanciaMetros: 5000,
          pesoKg: 0,
          duracaoMediaSegundos: 600,
        },
      ]);
    });

    it('funciona com um período sem coletas', () => {
      const vazio = resumirDashboard([], '2026-11-03', '2026-11-03');

      expect(vazio.totais).toMatchObject({
        coletas: 0,
        pesoKg: 0,
        duracaoMediaSegundos: null,
      });
      expect(vazio.pesoPorPeriodo).toEqual([
        { periodo: '2026-11-03', pesoKg: 0, coletas: 0 },
      ]);
      expect(vazio.clientes).toEqual([]);
    });
  });

  describe('linhaDoRelatorio', () => {
    const passo = (
      statusAnterior: StatusOrdem | null,
      statusNovo: StatusOrdem,
      hora: string,
      motivo: string | null = null,
    ) => ({
      statusAnterior,
      statusNovo,
      motivo,
      createdAt: new Date(`2026-11-03T${hora}:00Z`),
    });

    it('traz o que o gestor precisa na planilha, com o início e o fim da corrida', () => {
      const linha = linhaDoRelatorio({
        ...ordem({
          pesoRealKg: 1230.5,
          distanciaMetros: 12500,
          duracaoSegundos: 2700,
        }),
        enderecoColeta: 'Rua A, 100',
        pesoEstimadoKg: 1200,
        veiculo: { placa: 'ABC1D23' },
        historico: [
          passo(null, AGUARDANDO, '08:00'),
          passo(AGUARDANDO, EM_ANDAMENTO, '09:00'),
          passo(EM_ANDAMENTO, CONCLUIDA, '09:45'),
        ],
      });

      expect(linha).toEqual({
        id: 1,
        dataColeta: '2026-11-03',
        cliente: 'WEG',
        enderecoColeta: 'Rua A, 100',
        motorista: 'João',
        placa: 'ABC1D23',
        status: CONCLUIDA,
        pesoEstimadoKg: 1200,
        pesoRealKg: 1230.5,
        distanciaMetros: 12500,
        duracaoSegundos: 2700,
        inicio: new Date('2026-11-03T09:00:00Z'),
        fim: new Date('2026-11-03T09:45:00Z'),
        motivo: null,
      });
    });

    it('traz o motivo da falha ou do cancelamento e aceita coleta sem motorista', () => {
      const linha = linhaDoRelatorio({
        ...ordem({ status: CANCELADA, motoristaId: null, motorista: null }),
        enderecoColeta: 'Rua A, 100',
        pesoEstimadoKg: null,
        veiculo: null,
        historico: [
          passo(null, StatusOrdem.DISPONIVEL, '08:00'),
          passo(StatusOrdem.DISPONIVEL, CANCELADA, '10:00', 'Ninguém aceitou'),
        ],
      });

      expect(linha).toMatchObject({
        motorista: null,
        placa: null,
        inicio: null,
        fim: null,
        motivo: 'Ninguém aceitou',
      });
    });
  });
});
