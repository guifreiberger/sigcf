export type Perfil = 'GESTOR' | 'MOTORISTA'

export type StatusOrdem =
  | 'DISPONIVEL'
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
  // Caminhão que vem preenchido ao criar uma ordem para o motorista (RF14).
  veiculoPadraoId: number | null
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
  // Vazios enquanto a coleta está disponível para os motoristas aceitarem (RF12).
  veiculoId: number | null
  motoristaId: number | null
  enderecoColeta: string
  dataColeta: string
  pesoEstimadoKg: number | null
  // Peso medido na balança depois da coleta, registrado pelo gestor (RF08).
  pesoRealKg: number | null
  // Gravados quando a coleta termina, a partir do trajeto e do histórico.
  distanciaMetros: number | null
  duracaoSegundos: number | null
  status: StatusOrdem
  observacao: string | null
  createdAt: string
  updatedAt: string
  cliente: Cliente
  veiculo?: Veiculo | null
  motorista?: Motorista | null
  criadoPor?: { id: number; nome: string }
  historico?: Historico[]
  transicoesPermitidas: StatusOrdem[]
}

export type TipoRecorrencia = 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'INTERVALO' | 'INSUFICIENTE'

export type TendenciaPeso = 'ALTA' | 'QUEDA' | 'ESTAVEL' | 'INSUFICIENTE'

export type TipoAlerta = 'ATRASADA' | 'PREVISTA'

export interface AnaliseCliente {
  clienteId: number
  cliente: string
  totalColetas: number
  ultimaColeta: string | null
  recorrencia: {
    tipo: TipoRecorrencia
    descricao: string
    intervaloMedioDias: number | null
    regularidade: number | null
  }
  proximaPrevista: string | null
  proximaAgendada: string | null
  alerta: TipoAlerta | null
  peso: {
    mediaKg: number | null
    amostras: number
    tendencia: TendenciaPeso
    variacaoMensalPct: number | null
    r2: number | null
  }
}

export interface AlertaColeta {
  clienteId: number
  cliente: string
  tipo: TipoAlerta
  dataPrevista: string
  dias: number
  padrao: string
}

export interface Inteligencia {
  hoje: string
  janelaDias: number
  alertas: AlertaColeta[]
  clientes: AnaliseCliente[]
}

export interface Resumo {
  data: string
  total: number
  porStatus: Record<StatusOrdem, number>
}

// Dashboard do gestor (RF09): peso da balança, clientes e motoristas no período.
export interface Dashboard {
  de: string
  ate: string
  agrupamento: 'dia' | 'mes'
  totais: {
    coletas: number
    concluidas: number
    falhas: number
    canceladas: number
    pesoKg: number
    semPesagem: number
    distanciaMetros: number
    duracaoMediaSegundos: number | null
  }
  pesoPorPeriodo: { periodo: string; pesoKg: number; coletas: number }[]
  clientes: { clienteId: number; cliente: string; coletas: number; pesoKg: number }[]
  motoristas: {
    motoristaId: number
    motorista: string
    coletas: number
    falhas: number
    distanciaMetros: number
    pesoKg: number
    duracaoMediaSegundos: number | null
  }[]
}

// Linha do relatório de coletas por período (RF15).
export interface LinhaRelatorio {
  id: number
  dataColeta: string
  cliente: string
  enderecoColeta: string
  motorista: string | null
  placa: string | null
  status: StatusOrdem
  pesoEstimadoKg: number | null
  pesoRealKg: number | null
  distanciaMetros: number | null
  duracaoSegundos: number | null
  inicio: string | null
  fim: string | null
  motivo: string | null
}

export interface PontoTrajeto {
  latitude: number
  longitude: number
  precisaoMetros: number | null
  registradoEm: string
}

export interface Trajeto {
  ordemId: number
  status: StatusOrdem
  inicio: string | null
  fim: string | null
  distanciaMetros: number
  duracaoSegundos: number | null
  ultimaPosicao: PontoTrajeto | null
  pontos: PontoTrajeto[]
}

export interface MotoristaEmRota {
  ordemId: number
  motorista: { id: number; nome: string }
  cliente: string
  enderecoColeta: string
  placa: string
  inicio: string | null
  ultimaPosicao: PontoTrajeto | null
}
