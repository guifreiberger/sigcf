import type { ValueTransformer } from 'typeorm';

// O driver do MySQL devolve DECIMAL como string para não perder precisão.
export const decimalParaNumero: ValueTransformer = {
  to: (valor: number | null) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};
