import { Perfil } from '../usuarios/perfil.enum.js';
import { StatusOrdem } from './status-ordem.enum.js';

interface Regra {
  de: StatusOrdem[];
  para: StatusOrdem;
  perfil: Perfil;
  exigeMotivo: boolean;
}

const REGRAS: Regra[] = [
  {
    de: [StatusOrdem.AGUARDANDO],
    para: StatusOrdem.EM_ANDAMENTO,
    perfil: Perfil.MOTORISTA,
    exigeMotivo: false,
  },
  {
    de: [StatusOrdem.EM_ANDAMENTO],
    para: StatusOrdem.CONCLUIDA,
    perfil: Perfil.MOTORISTA,
    exigeMotivo: false,
  },
  {
    de: [StatusOrdem.EM_ANDAMENTO],
    para: StatusOrdem.FALHA,
    perfil: Perfil.MOTORISTA,
    exigeMotivo: true,
  },
  {
    de: [StatusOrdem.AGUARDANDO, StatusOrdem.EM_ANDAMENTO],
    para: StatusOrdem.CANCELADA,
    perfil: Perfil.GESTOR,
    exigeMotivo: true,
  },
];

export type TipoErroTransicao =
  'INVALIDA' | 'NAO_PERMITIDA' | 'MOTIVO_OBRIGATORIO';

export class TransicaoError extends Error {
  constructor(
    readonly tipo: TipoErroTransicao,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export function validarTransicao(
  atual: StatusOrdem,
  novo: StatusOrdem,
  perfil: Perfil,
  motivo?: string | null,
): void {
  const regra = REGRAS.find((r) => r.para === novo && r.de.includes(atual));
  if (!regra) {
    throw new TransicaoError(
      'INVALIDA',
      `Não é possível alterar o status de ${atual} para ${novo}.`,
    );
  }
  if (regra.perfil !== perfil) {
    const quem =
      regra.perfil === Perfil.GESTOR ? 'o gestor' : 'o motorista responsável';
    throw new TransicaoError(
      'NAO_PERMITIDA',
      `Somente ${quem} pode alterar o status para ${novo}.`,
    );
  }
  if (regra.exigeMotivo && !motivo?.trim()) {
    throw new TransicaoError(
      'MOTIVO_OBRIGATORIO',
      `Informe o motivo para alterar o status para ${novo}.`,
    );
  }
}

export function transicoesPermitidas(
  atual: StatusOrdem,
  perfil: Perfil,
): StatusOrdem[] {
  return REGRAS.filter((r) => r.perfil === perfil && r.de.includes(atual)).map(
    (r) => r.para,
  );
}

export function exigeMotivo(novo: StatusOrdem): boolean {
  return REGRAS.some((r) => r.para === novo && r.exigeMotivo);
}
