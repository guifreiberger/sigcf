import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarVeiculoDto } from './veiculo.dto.js';

async function validar(placa: string) {
  const instancia = plainToInstance(CriarVeiculoDto, {
    placa,
    modelo: 'VW Delivery',
    capacidadeKg: 5000,
  });
  const erros = await validate(instancia);
  return { placa: instancia.placa, campos: erros.map((e) => e.property) };
}

describe('CriarVeiculoDto', () => {
  it.each([
    ['padrão antigo com hífen', 'abc-1234', 'ABC1234'],
    ['Mercosul com espaço', 'abc 1d23', 'ABC1D23'],
  ])('normaliza a placa no %s', async (_, digitada, normalizada) => {
    await expect(validar(digitada)).resolves.toEqual({
      placa: normalizada,
      campos: [],
    });
  });

  it.each(['AB1234', 'ABCD123', '1234ABC'])(
    'recusa a placa %s',
    async (placa) => {
      expect((await validar(placa)).campos).toEqual(['placa']);
    },
  );
});
