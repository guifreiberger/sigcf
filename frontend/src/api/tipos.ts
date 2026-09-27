export type Perfil = 'GESTOR' | 'MOTORISTA'

export type StatusOrdem =
  | 'AGUARDANDO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'FALHA'
  | 'CANCELADA'

export interface UsuarioSessao {
  id: number
  nome: string
  email: string
  perfil: Perfil
}

export interface Sessao {
  token: string
  usuario: UsuarioSessao
}

export interface Motorista {
  id: number
  nome: string
  email: string
  perfil: Perfil
  telefone: string | null
  cnh: string | null
  ativo: boolean
}

export interface Veiculo {
  id: number
  placa: string
  modelo: string
  capacidadeKg: number
  ativo: boolean
}

export interface Cliente {
  id: number
  nome: string
  telefone: string | null
  endereco: string
  ativo: boolean
}

export interface Localizacao {
  latitude: number
  longitude: number
  precisaoMetros?: number
}

export interface Historico {
  id: number
  statusAnterior: StatusOrdem | null
  statusNovo: StatusOrdem
  motivo: string | null
  latitude: number | null
  longitude: number | null
  precisaoMetros: number | null
  createdAt: string
  usuario: { id: number; nome: string; perfil: Perfil }
}

export interface Ordem {
  id: number
  clienteId: number
  veiculoId: number
  motoristaId: number
  enderecoColeta: string
  dataColeta: string
  status: StatusOrdem
  observacao: string | null
  createdAt: string
  updatedAt: string
  cliente: Cliente
  veiculo: Veiculo
  motorista?: Motorista
  criadoPor?: { id: number; nome: string }
  historico?: Historico[]
  transicoesPermitidas: StatusOrdem[]
}

export interface Resumo {
  data: string
  total: number
  porStatus: Record<StatusOrdem, number>
}
