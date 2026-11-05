import { Perfil } from '../usuarios/perfil.enum.js';
import { StatusOrdem } from './status-ordem.enum.js';
import {
  TransicaoError,
  transicoesPermitidas,
  validarTransicao,
} from './transicoes.js';

const { DISPONIVEL, AGUARDANDO, EM_ANDAMENTO, CONCLUIDA, FALHA, CANCELADA } =
  StatusOrdem;
const { GESTOR, MOTORISTA } = Perfil;

function erroDe(fn: () => void) {
  try {
    fn();
  } catch (e) {
    if (e instanceof TransicaoError) return e.tipo;
    throw e;
  }
  return null;
}

describe('máquina de estados da ordem de coleta (RF04)', () => {
  describe('transições válidas', () => {
    it.each([
      [AGUARDANDO, EM_ANDAMENTO, MOTORISTA, undefined],
      [EM_ANDAMENTO, CONCLUIDA, MOTORISTA, undefined],
      [EM_ANDAMENTO, FALHA, MOTORISTA, 'Cliente ausente'],
      [AGUARDANDO, CANCELADA, GESTOR, 'Cliente desistiu'],
      [DISPONIVEL, CANCELADA, GESTOR, 'Nenhum motorista disponível'],
      [EM_ANDAMENTO, CANCELADA, GESTOR, 'Veículo quebrou'],
    ])('%s → %s por %s', (de, para, perfil, motivo) => {
      expect(
        erroDe(() => validarTransicao(de, para, perfil, motivo)),
      ).toBeNull();
    });
  });

  describe('transições que pulam etapas ou saem de estado final', () => {
    it.each([
      [AGUARDANDO, CONCLUIDA],
      [AGUARDANDO, FALHA],
      [AGUARDANDO, AGUARDANDO],
      [EM_ANDAMENTO, AGUARDANDO],
      [CONCLUIDA, EM_ANDAMENTO],
      [CONCLUIDA, CANCELADA],
      [FALHA, EM_ANDAMENTO],
      [FALHA, CANCELADA],
      [CANCELADA, AGUARDANDO],
      // Uma coleta disponível só vira "aguardando" pela aceitação, que define o motorista.
      [DISPONIVEL, AGUARDANDO],
      [DISPONIVEL, EM_ANDAMENTO],
      [DISPONIVEL, CONCLUIDA],
      [AGUARDANDO, DISPONIVEL],
    ])('%s → %s é inválida', (de, para) => {
      for (const perfil of [GESTOR, MOTORISTA]) {
        expect(erroDe(() => validarTransicao(de, para, perfil, 'motivo'))).toBe(
          'INVALIDA',
        );
      }
    });
  });

  describe('permissões por perfil', () => {
    it('somente o gestor cancela uma coleta disponível', () => {
      expect(
        erroDe(() => validarTransicao(DISPONIVEL, CANCELADA, MOTORISTA, 'x')),
      ).toBe('NAO_PERMITIDA');
    });

    it('somente o gestor pode cancelar', () => {
      expect(
        erroDe(() => validarTransicao(AGUARDANDO, CANCELADA, MOTORISTA, 'x')),
      ).toBe('NAO_PERMITIDA');
      expect(
        erroDe(() => validarTransicao(EM_ANDAMENTO, CANCELADA, MOTORISTA, 'x')),
      ).toBe('NAO_PERMITIDA');
    });

    it('o gestor não executa etapas de campo', () => {
      expect(
        erroDe(() => validarTransicao(AGUARDANDO, EM_ANDAMENTO, GESTOR)),
      ).toBe('NAO_PERMITIDA');
      expect(
        erroDe(() => validarTransicao(EM_ANDAMENTO, CONCLUIDA, GESTOR)),
      ).toBe('NAO_PERMITIDA');
    });
  });

  describe('motivo obrigatório', () => {
    it.each([
      [EM_ANDAMENTO, FALHA, MOTORISTA],
      [AGUARDANDO, CANCELADA, GESTOR],
      [DISPONIVEL, CANCELADA, GESTOR],
    ])('%s → %s exige motivo', (de, para, perfil) => {
      for (const motivo of [undefined, null, '', '   ']) {
        expect(erroDe(() => validarTransicao(de, para, perfil, motivo))).toBe(
          'MOTIVO_OBRIGATORIO',
        );
      }
    });
  });

  describe('transicoesPermitidas', () => {
    it.each([
      [AGUARDANDO, MOTORISTA, [EM_ANDAMENTO]],
      [EM_ANDAMENTO, MOTORISTA, [CONCLUIDA, FALHA]],
      [AGUARDANDO, GESTOR, [CANCELADA]],
      [EM_ANDAMENTO, GESTOR, [CANCELADA]],
      [CONCLUIDA, MOTORISTA, []],
      [FALHA, GESTOR, []],
      [CANCELADA, GESTOR, []],
      [DISPONIVEL, GESTOR, [CANCELADA]],
      // O motorista aceita pela rota própria, que define o motorista e o veículo.
      [DISPONIVEL, MOTORISTA, []],
    ])('%s para %s', (status, perfil, esperado) => {
      expect(transicoesPermitidas(status, perfil)).toEqual(esperado);
    });
  });
});
