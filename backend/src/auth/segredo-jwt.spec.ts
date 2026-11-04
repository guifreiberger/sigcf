import { lerSegredoJwt, SEGREDO_DE_EXEMPLO } from './segredo-jwt.js';

const aleatorio = 'f3a9c1e07b5d4a2e9c8b7a6f5e4d3c2b1a0f9e8d';

describe('lerSegredoJwt', () => {
  it('exige o segredo configurado', () => {
    expect(() => lerSegredoJwt({})).toThrow('JWT_SECRET não configurado.');
  });

  it('aceita qualquer segredo em desenvolvimento', () => {
    expect(lerSegredoJwt({ JWT_SECRET: 'curto' })).toBe('curto');
  });

  it.each([
    ['o valor de exemplo do .env.example', SEGREDO_DE_EXEMPLO],
    ['um segredo curto', 'senha-da-empresa-2026'],
  ])('recusa %s em produção', (_, JWT_SECRET) => {
    expect(() => lerSegredoJwt({ JWT_SECRET, NODE_ENV: 'production' })).toThrow(
      /inseguro para produção/,
    );
  });

  it('aceita um segredo aleatório longo em produção', () => {
    expect(
      lerSegredoJwt({ JWT_SECRET: aleatorio, NODE_ENV: 'production' }),
    ).toBe(aleatorio);
  });
});
