import type { StatusOrdem } from '../api/tipos.ts'

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

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

export function formatarDuracao(segundos: number) {
  const minutos = Math.round(segundos / 60)
  if (minutos < 1) return 'menos de 1 min'
  if (minutos < 60) return `${minutos} min`
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`
}

export function formatarDistancia(metros: number) {
  if (metros < 1000) return `${Math.round(metros)} m`
  return `${(metros / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}

export function tempoDesde(iso: string, agora = Date.now()) {
  const segundos = Math.max(0, (agora - new Date(iso).getTime()) / 1000)
  return segundos < 60 ? 'agora há pouco' : `há ${formatarDuracao(segundos)}`
}

export function linkMapa(endereco: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
}

export function linkCoordenadas(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
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
