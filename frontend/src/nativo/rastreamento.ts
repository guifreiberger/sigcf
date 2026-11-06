import { registerPlugin } from '@capacitor/core'

export interface EstadoDoRastreamento {
  // Há coleta em andamento com o serviço gravando o trajeto.
  ativo: boolean
  // Posições guardadas no aparelho que ainda não chegaram ao servidor.
  pendentes: number
  // Horário da última posição guardada, em milissegundos.
  ultimaLeitura: number | null
  // O servidor informou que o motorista não tem coleta em andamento (ex.: o gestor cancelou).
  encerradaNoServidor: boolean
}

interface RastreamentoPlugin {
  iniciar(opcoes: { endereco: string; token: string }): Promise<void>
  parar(): Promise<void>
  estado(): Promise<EstadoDoRastreamento>
  enviarPendentes(): Promise<{ pendentes: number }>
  abrirConfiguracoes(): Promise<void>
}

// Serviço do app Android que grava e envia o trajeto da coleta por conta própria, sem depender
// desta tela, que o Android congela com a tela apagada (ADR 0010). O código nativo fica em
// android/app/src/main/java/io/github/guifreiberger/sigcf/rastreamento.
const Rastreamento = registerPlugin<RastreamentoPlugin>('Rastreamento')

// Na primeira vez, o Android pede a permissão de localização ("durante o uso do app" basta) e a
// de notificação. Sem a localização, a promessa é rejeitada com o código SEM_PERMISSAO.
export function iniciarRastreamentoNativo(endereco: string, token: string) {
  return Rastreamento.iniciar({ endereco, token })
}

export function pararRastreamentoNativo() {
  return Rastreamento.parar()
}

export function estadoDoRastreamentoNativo() {
  return Rastreamento.estado()
}

export function enviarPendentesNativos() {
  return Rastreamento.enviarPendentes()
}

export function abrirConfiguracoesDoApp() {
  return Rastreamento.abrirConfiguracoes()
}
