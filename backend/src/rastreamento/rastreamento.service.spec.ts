import { ConflictException, NotFoundException } from '@nestjs/common';
import { IsNull, LessThanOrEqual, type Repository } from 'typeorm';
import type { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import type { PontoTrajeto } from './ponto-trajeto.entity.js';
import { RastreamentoService } from './rastreamento.service.js';

const joao = { id: 7, nome: 'João', perfil: Perfil.MOTORISTA };
const AGORA = new Date('2026-11-04T15:30:00Z');
const as = (hora: string) => new Date(`2026-11-04T${hora}Z`);

const leitura = (latitude: number, hora: string, precisaoMetros = 8) => ({
  latitude,
  longitude: -49.07,
  precisaoMetros,
  registradoEm: as(hora),
});

const historicoIniciado = [
  {
    statusAnterior: null,
    statusNovo: StatusOrdem.AGUARDANDO,
    createdAt: as('14:00:00'),
  },
  {
    statusAnterior: StatusOrdem.AGUARDANDO,
    statusNovo: StatusOrdem.EM_ANDAMENTO,
    createdAt: as('15:00:00'),
  },
];

describe('RastreamentoService', () => {
  const pontos = { insert: vi.fn(), find: vi.fn(), findOne: vi.fn() };
  const ordens = { find: vi.fn(), findOne: vi.fn() };
  const service = new RastreamentoService(
    pontos as unknown as Repository<PontoTrajeto>,
    ordens as unknown as Repository<OrdemColeta>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });

  afterEach(() => vi.useRealTimers());

  describe('registrar', () => {
    const lote = {
      pontos: [
        {
          latitude: -26.48,
          longitude: -49.07,
          precisaoMetros: 7.6,
          registradoEm: '2026-11-04T15:10:00.250Z',
        },
        {
          latitude: -26.479,
          longitude: -49.07,
          registradoEm: '2026-11-04T15:10:15.000Z',
        },
      ],
    };

    it('só procura as coletas em andamento do próprio motorista', async () => {
      ordens.find.mockResolvedValue([{ id: 10 }]);

      await service.registrar(joao, lote);

      expect(ordens.find).toHaveBeenCalledWith({
        select: { id: true },
        where: { motoristaId: 7, status: StatusOrdem.EM_ANDAMENTO },
      });
    });

    it('grava as leituras com o horário do celular e a precisão arredondada', async () => {
      ordens.find.mockResolvedValue([{ id: 10 }]);

      await service.registrar(joao, lote);

      expect(pontos.insert).toHaveBeenCalledWith([
        {
          ordemId: 10,
          latitude: -26.48,
          longitude: -49.07,
          precisaoMetros: 8,
          registradoEm: new Date('2026-11-04T15:10:00.250Z'),
        },
        {
          ordemId: 10,
          latitude: -26.479,
          longitude: -49.07,
          precisaoMetros: null,
          registradoEm: new Date('2026-11-04T15:10:15.000Z'),
        },
      ]);
    });

    it('atribui o trajeto a cada coleta que estiver em andamento', async () => {
      ordens.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);

      await service.registrar(joao, lote);

      const gravados = pontos.insert.mock.calls[0][0] as { ordemId: number }[];
      expect(gravados.map((p) => p.ordemId)).toEqual([10, 10, 11, 11]);
    });

    it('recusa leituras quando não há coleta em andamento, para o celular parar de enviar', async () => {
      ordens.find.mockResolvedValue([]);

      await expect(service.registrar(joao, lote)).rejects.toThrow(
        ConflictException,
      );
      expect(pontos.insert).not.toHaveBeenCalled();
    });
  });

  describe('trajeto', () => {
    it('resume a corrida em andamento até agora', async () => {
      ordens.findOne.mockResolvedValue({
        id: 10,
        status: StatusOrdem.EM_ANDAMENTO,
        historico: historicoIniciado,
      });
      pontos.find.mockResolvedValue([
        leitura(-26.479, '15:10:15'),
        leitura(-26.48, '15:10:00'),
        leitura(-26.4, '15:10:30', 900),
      ]);

      await expect(service.trajeto(10)).resolves.toEqual({
        ordemId: 10,
        status: StatusOrdem.EM_ANDAMENTO,
        inicio: as('15:00:00'),
        fim: null,
        distanciaMetros: 111,
        duracaoSegundos: 1800,
        ultimaPosicao: leitura(-26.479, '15:10:15'),
        pontos: [leitura(-26.48, '15:10:00'), leitura(-26.479, '15:10:15')],
      });
    });

    it('mede a corrida concluída do início ao fim', async () => {
      ordens.findOne.mockResolvedValue({
        id: 10,
        status: StatusOrdem.CONCLUIDA,
        historico: [
          ...historicoIniciado,
          {
            statusAnterior: StatusOrdem.EM_ANDAMENTO,
            statusNovo: StatusOrdem.CONCLUIDA,
            createdAt: as('15:20:00'),
          },
        ],
      });
      pontos.find.mockResolvedValue([]);

      await expect(service.trajeto(10)).resolves.toMatchObject({
        fim: as('15:20:00'),
        duracaoSegundos: 1200,
        distanciaMetros: 0,
        ultimaPosicao: null,
      });
    });

    it('carrega o histórico em ordem e só os campos do mapa', async () => {
      ordens.findOne.mockResolvedValue({
        id: 10,
        status: StatusOrdem.EM_ANDAMENTO,
        historico: historicoIniciado,
      });
      pontos.find.mockResolvedValue([]);

      await service.trajeto(10);

      expect(ordens.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: { historico: true },
        order: { historico: { id: 'ASC' } },
      });
      expect(pontos.find).toHaveBeenCalledWith({
        select: {
          latitude: true,
          longitude: true,
          precisaoMetros: true,
          registradoEm: true,
        },
        where: { ordemId: 10 },
      });
    });

    it('lança NotFound quando a ordem não existe', async () => {
      ordens.findOne.mockResolvedValue(null);

      await expect(service.trajeto(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('emRota', () => {
    const emAndamento = (
      id: number,
      motorista: { id: number; nome: string },
    ) => ({
      id,
      enderecoColeta: 'Rua A, 100',
      motorista: {
        ...motorista,
        email: 'x@sigcf.local',
        telefone: '47999990000',
      },
      cliente: { nome: 'WEG' },
      veiculo: { placa: 'ABC1234' },
      historico: historicoIniciado,
    });

    it('lista quem está em coleta com a última posição confiável', async () => {
      ordens.find.mockResolvedValue([
        emAndamento(10, { id: 7, nome: 'João' }),
        emAndamento(11, { id: 8, nome: 'Maria' }),
      ]);
      pontos.findOne
        .mockResolvedValueOnce(leitura(-26.479, '15:29:45'))
        .mockResolvedValueOnce(null);

      await expect(service.emRota()).resolves.toEqual([
        {
          ordemId: 10,
          motorista: { id: 7, nome: 'João' },
          cliente: 'WEG',
          enderecoColeta: 'Rua A, 100',
          placa: 'ABC1234',
          inicio: as('15:00:00'),
          ultimaPosicao: leitura(-26.479, '15:29:45'),
        },
        expect.objectContaining({ ordemId: 11, ultimaPosicao: null }),
      ]);
    });

    it('consulta só ordens em andamento e ignora leituras imprecisas', async () => {
      ordens.find.mockResolvedValue([emAndamento(10, { id: 7, nome: 'João' })]);
      pontos.findOne.mockResolvedValue(null);

      await service.emRota();

      expect(ordens.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: StatusOrdem.EM_ANDAMENTO },
        }),
      );
      expect(pontos.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { ordemId: 10, precisaoMetros: LessThanOrEqual(100) },
            { ordemId: 10, precisaoMetros: IsNull() },
          ],
          order: { registradoEm: 'DESC', id: 'DESC' },
        }),
      );
    });
  });
});
