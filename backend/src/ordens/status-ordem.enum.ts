export enum StatusOrdem {
  // Publicada pelo gestor sem motorista, à espera de quem a aceite (RF12).
  DISPONIVEL = 'DISPONIVEL',
  AGUARDANDO = 'AGUARDANDO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  FALHA = 'FALHA',
  CANCELADA = 'CANCELADA',
}
