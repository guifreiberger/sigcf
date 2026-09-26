import type { StatusOrdem } from '../api/tipos.ts'

export function hojeLocal() {
  return new Date().toLocaleDateString('en-CA')
}

export function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarDataExtenso(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatarHora(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('pt-BR')
}

export function formatarTelefone(telefone: string | null) {
  if (!telefone) return '—'
  const d = telefone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone
}

export function formatarPlaca(placa: string) {
  return /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa
}

export function formatarKg(kg: number) {
  return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
}

export function linkMapa(endereco: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
}

export const ROTULO_STATUS: Record<StatusOrdem, string> = {
  AGUARDANDO: 'Aguardando',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  FALHA: 'Falha',
  CANCELADA: 'Cancelada',
}

export const ORDEM_STATUS: StatusOrdem[] = [
  'AGUARDANDO',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'FALHA',
  'CANCELADA',
]
