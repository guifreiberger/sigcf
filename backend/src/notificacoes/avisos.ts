import { somarDias } from '../common/data.js';

export interface Aviso {
  titulo: string;
  corpo: string;
  url: string;
  tag: string;
}

interface OrdemDoAviso {
  id: number;
  dataColeta: string;
  enderecoColeta: string;
  pesoEstimadoKg: number | null;
  cliente: { nome: string };
}

export function quando(data: string, hoje: string) {
  if (data === hoje) return 'hoje';
  if (data === somarDias(hoje, 1)) return 'amanhã';
  const [, mes, dia] = data.split('-');
  return `em ${dia}/${mes}`;
}

const formatarKg = (kg: number) =>
  `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;

// A mesma tag por ordem faz o aviso de cancelamento substituir o de nova coleta no celular.
const tag = (ordem: OrdemDoAviso) => `ordem-${ordem.id}`;

export function avisoNovaColeta(ordem: OrdemDoAviso, hoje: string): Aviso {
  const peso =
    ordem.pesoEstimadoKg != null
      ? ` · cerca de ${formatarKg(ordem.pesoEstimadoKg)}`
      : '';
  return {
    titulo: 'Nova coleta para você',
    corpo: `${ordem.cliente.nome}, ${quando(ordem.dataColeta, hoje)}${peso}\n${ordem.enderecoColeta}`,
    url: '/motorista',
    tag: tag(ordem),
  };
}

export function avisoColetaCancelada(
  ordem: OrdemDoAviso,
  hoje: string,
  motivo: string,
): Aviso {
  return {
    titulo: 'Coleta cancelada',
    corpo: `${ordem.cliente.nome}, ${quando(ordem.dataColeta, hoje)}: ${motivo}`,
    url: '/motorista',
    tag: tag(ordem),
  };
}
