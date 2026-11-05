import { MoreThanOrEqual, Not, type Repository } from 'typeorm';
import type { Cliente } from '../clientes/cliente.entity.js';
import type { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import { InteligenciaService } from './inteligencia.service.js';

const HOJE = '2026-11-04';

const clientes = [
  { id: 1, nome: 'Atrasado Ltda' },
  { id: 2, nome: 'Previsto S.A.' },
  { id: 3, nome: 'Agendado ME' },
  { id: 4, nome: 'Novo Cliente' },
];

const coleta = (
  clienteId: number,
  dataColeta: string,
  pesoEstimadoKg: number | null = null,
) => ({
  clienteId,
  dataColeta,
  pesoEstimadoKg,
});

const ordens = [
  // Toda segunda-feira, com peso crescente; a última foi em 19/10.
  coleta(1, '2026-10-12', 140),
  coleta(1, '2026-09-28', 100),
  coleta(1, '2026-10-19', 160),
  coleta(1, '2026-10-05', 120),
  // Toda sexta-feira; a próxima cai daqui a dois dias.
  coleta(2, '2026-10-09', 50),
  coleta(2, '2026-10-16'),
  coleta(2, '2026-10-23'),
  coleta(2, '2026-10-30'),
  // Toda terça-feira, mas o atendente já agendou a próxima.
  coleta(3, '2026-10-13'),
  coleta(3, '2026-10-20'),
  coleta(3, '2026-10-27'),
  coleta(3, '2026-11-10'),
  // Cliente inativo: não aparece na análise.
  coleta(9, '2026-10-01'),
];

describe('InteligenciaService', () => {
  const repoOrdens = { find: vi.fn().mockResolvedValue(ordens) };
  const repoClientes = { find: vi.fn().mockResolvedValue(clientes) };
  const service = new InteligenciaService(
    repoOrdens as unknown as Repository<OrdemColeta>,
    repoClientes as unknown as Repository<Cliente>,
  );

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${HOJE}T15:00:00Z`));
  });

  afterEach(() => vi.useRealTimers());

  it('analisa os últimos 365 dias, sem as coletas canceladas', async () => {
    const resultado = await service.analisarClientes();

    expect(resultado).toMatchObject({ hoje: HOJE, janelaDias: 365 });
    expect(repoClientes.find).toHaveBeenCalledWith({
      where: { ativo: true },
      order: { nome: 'ASC' },
    });
    expect(repoOrdens.find).toHaveBeenCalledWith({
      select: { clienteId: true, dataColeta: true, pesoEstimadoKg: true },
      where: {
        dataColeta: MoreThanOrEqual('2025-11-04'),
        status: Not(StatusOrdem.CANCELADA),
      },
    });
  });

  it('identifica o padrão e a próxima coleta de cada cliente ativo', async () => {
    const { clientes: analises } = await service.analisarClientes();

    expect(analises.map((a) => a.clienteId)).toEqual([1, 2, 3, 4]);
    expect(analises[0]).toMatchObject({
      cliente: 'Atrasado Ltda',
      totalColetas: 4,
      ultimaColeta: '2026-10-19',
      recorrencia: { tipo: 'SEMANAL' },
      proximaPrevista: '2026-10-26',
      proximaAgendada: null,
      alerta: 'ATRASADA',
    });
  });

  it('separa as coletas já realizadas da próxima agendada', async () => {
    const { clientes: analises } = await service.analisarClientes();

    expect(analises[2]).toMatchObject({
      totalColetas: 3,
      ultimaColeta: '2026-10-27',
      proximaPrevista: '2026-11-03',
      proximaAgendada: '2026-11-10',
      alerta: null,
    });
  });

  it('não arrisca previsão para cliente sem histórico', async () => {
    const { clientes: analises } = await service.analisarClientes();

    expect(analises[3]).toMatchObject({
      totalColetas: 0,
      ultimaColeta: null,
      recorrencia: { tipo: 'INSUFICIENTE' },
      proximaPrevista: null,
      proximaAgendada: null,
      alerta: null,
      peso: { amostras: 0, tendencia: 'INSUFICIENTE' },
    });
  });

  it('calcula o peso só com as coletas que têm estimativa', async () => {
    const { clientes: analises } = await service.analisarClientes();

    expect(analises[0].peso).toMatchObject({
      mediaKg: 130,
      amostras: 4,
      tendencia: 'ALTA',
    });
    expect(analises[1].peso).toMatchObject({
      mediaKg: 50,
      amostras: 1,
      tendencia: 'INSUFICIENTE',
    });
  });

  it('lista os alertas do mais atrasado para o mais distante', async () => {
    const { alertas } = await service.analisarClientes();

    expect(alertas).toEqual([
      {
        clienteId: 1,
        cliente: 'Atrasado Ltda',
        tipo: 'ATRASADA',
        dataPrevista: '2026-10-26',
        dias: -9,
        padrao: expect.any(String),
      },
      {
        clienteId: 2,
        cliente: 'Previsto S.A.',
        tipo: 'PREVISTA',
        dataPrevista: '2026-11-06',
        dias: 2,
        padrao: expect.any(String),
      },
    ]);
  });
});
