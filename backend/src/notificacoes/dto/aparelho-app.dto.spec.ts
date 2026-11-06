import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AparelhoAppDto } from './aparelho-app.dto.js';

async function errosDo(token: unknown) {
  const erros = await validate(plainToInstance(AparelhoAppDto, { token }));
  return erros.map((e) => e.property);
}

describe('AparelhoAppDto', () => {
  it('aceita o token que o Firebase gera para o aparelho', async () => {
    expect(
      await errosDo(
        'dX1y-Z2_ab:APA91bHq0r-5mFhT_kL3vW9xYz8QwErTyUiOpAsDfGhJkLzXcVbNm1234567890',
      ),
    ).toEqual([]);
  });

  it.each([
    ['vazio', ''],
    ['com espaços', 'token com espaços'],
    ['com caracteres de HTML', '<script>alert(1)</script>'],
    ['longo demais', 'a'.repeat(501)],
    ['que não é texto', 123],
  ])('recusa token %s', async (_, token) => {
    expect(await errosDo(token)).toEqual(['token']);
  });
});
