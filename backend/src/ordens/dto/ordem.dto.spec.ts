import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StatusOrdem } from '../status-ordem.enum.js';
import {
  AlterarStatusDto,
  CriarOrdemDto,
  FiltroOrdensDto,
} from './ordem.dto.js';

async function validar<T extends object>(Classe: new () => T, dados: object) {
  const instancia = plainToInstance(Classe, dados);
  const erros = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instancia, erros };
}

const campos = (erros: { property: string }[]) => erros.map((e) => e.property);

const ordem = {
  clienteId: 3,
  veiculoId: 4,
  motoristaId: 7,
  dataColeta: '2026-11-04',
};

describe('DTOs de ordem de coleta', () => {
  describe('CriarOrdemDto', () => {
    it('aceita a ordem com os campos obrigatórios', async () => {
      expect(campos((await validar(CriarOrdemDto, ordem)).erros)).toEqual([]);
    });

    it('exige cliente, veículo, motorista e data', async () => {
      const { erros } = await validar(CriarOrdemDto, {});

      expect(campos(erros).sort()).toEqual([
        'clienteId',
        'dataColeta',
        'motoristaId',
        'veiculoId',
      ]);
    });

    it.each([
      ['zero', 0],
      ['negativo', -10],
      ['com mais de duas casas decimais', 10.123],
    ])('recusa peso estimado %s', async (_, pesoEstimadoKg) => {
      const { erros } = await validar(CriarOrdemDto, {
        ...ordem,
        pesoEstimadoKg,
      });

      expect(campos(erros)).toEqual(['pesoEstimadoKg']);
    });

    it('recusa endereço em branco quando informado', async () => {
      const { erros } = await validar(CriarOrdemDto, {
        ...ordem,
        enderecoColeta: '',
      });

      expect(campos(erros)).toEqual(['enderecoColeta']);
    });
  });

  describe('AlterarStatusDto', () => {
    it('recusa status inexistente', async () => {
      const { erros } = await validar(AlterarStatusDto, { status: 'PAUSADA' });

      expect(erros[0].constraints).toEqual({ isEnum: 'status inválido' });
    });

    it('aceita localização válida', async () => {
      const { erros } = await validar(AlterarStatusDto, {
        status: StatusOrdem.EM_ANDAMENTO,
        localizacao: {
          latitude: -26.48,
          longitude: -49.07,
          precisaoMetros: 15,
        },
      });

      expect(erros).toEqual([]);
    });

    it.each([
      ['latitude', { latitude: 91, longitude: 0 }],
      ['longitude', { latitude: 0, longitude: -181 }],
      ['precisaoMetros', { latitude: 0, longitude: 0, precisaoMetros: -1 }],
    ])('recusa %s fora da faixa', async (campo, localizacao) => {
      const { erros } = await validar(AlterarStatusDto, {
        status: StatusOrdem.EM_ANDAMENTO,
        localizacao,
      });

      expect(campos(erros)).toEqual(['localizacao']);
      expect(campos(erros[0].children ?? [])).toEqual([campo]);
    });
  });

  describe('FiltroOrdensDto', () => {
    it('converte os ids da query string em números', async () => {
      const { instancia, erros } = await validar(FiltroOrdensDto, {
        motoristaId: '7',
        clienteId: '3',
        status: 'FALHA',
      });

      expect(erros).toEqual([]);
      expect(instancia).toMatchObject({ motoristaId: 7, clienteId: 3 });
    });

    it('recusa id que não é número', async () => {
      const { erros } = await validar(FiltroOrdensDto, { motoristaId: 'abc' });

      expect(campos(erros)).toEqual(['motoristaId']);
    });
  });
});
