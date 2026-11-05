// Valor publicado no .env.example: serve para desenvolvimento e nunca pode chegar à produção.
export const SEGREDO_DE_EXEMPLO = 'troque-este-valor-antes-de-qualquer-deploy';
const TAMANHO_MINIMO_EM_PRODUCAO = 32;

// Com um segredo fraco, qualquer um poderia assinar tokens e se passar pelo gestor.
export function lerSegredoJwt(ambiente: NodeJS.ProcessEnv = process.env) {
  const segredo = ambiente.JWT_SECRET;
  if (!segredo) throw new Error('JWT_SECRET não configurado.');
  if (
    ambiente.NODE_ENV === 'production' &&
    (segredo === SEGREDO_DE_EXEMPLO ||
      segredo.length < TAMANHO_MINIMO_EM_PRODUCAO)
  ) {
    throw new Error(
      'JWT_SECRET inseguro para produção: use um valor aleatório com pelo menos 32 caracteres.',
    );
  }
  return segredo;
}
