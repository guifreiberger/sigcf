import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegistrarPontosDto } from './pontos.dto.js';

const leitura = {
  latitude: -26.48,
  longitude: -49.07,
  precisaoMetros: 8,
  registradoEm: '2026-11-04T15:10:00.250Z',
};

async function errosDo(pontos: unknown) {
  const erros = await validate(plainToInstance(RegistrarPontosDto, { pontos }));
  return erros.flatMap((e) =>
    e.children?.length
      ? e.children.flatMap((filho) =>
          (filho.children ?? []).map((neto) => neto.property),
        )
      : [e.property],
  );
}

describe('RegistrarPontosDto', () => {
  it('aceita um lote de leituras, com ou sem a precisão', async () => {
    const semPrecisao = { ...leitura, precisaoMetros: undefined };

    expect(await errosDo([leitura, semPrecisao])).toEqual([]);
  });

  it.each([
    ['vazio', []],
    ['que não é uma lista', 'pontos'],
    ['com mais de 200 leituras', Array.from({ length: 201 }, () => leitura)],
  ])('recusa lote %s', async (_, pontos) => {
    expect(await errosDo(pontos)).toEqual(['pontos']);
  });

  it.each([
    ['latitude', { latitude: -91 }],
    ['longitude', { longitude: 181 }],
    ['precisaoMetros', { precisaoMetros: -5 }],
    ['registradoEm', { registradoEm: '04/11/2026 15:10' }],
  ])('recusa leitura com %s inválida', async (campo, alteracao) => {
    expect(await errosDo([{ ...leitura, ...alteracao }])).toEqual([campo]);
  });
});
