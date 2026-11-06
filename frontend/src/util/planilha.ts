import type { LinhaRelatorio } from '../api/tipos.ts'
import { formatarData, formatarPlaca, ROTULO_STATUS } from './formatos.ts'

const CABECALHO = [
  'Nº',
  'Data',
  'Cliente',
  'Endereço',
  'Motorista',
  'Caminhão',
  'Status',
  'Peso estimado (kg)',
  'Peso da balança (kg)',
  'Distância (km)',
  'Tempo da coleta (min)',
  'Início',
  'Fim',
  'Motivo',
]

// Números com vírgula decimal e sem separador de milhar: o Excel em português os lê como número.
const numero = (valor: number | null) => (valor == null ? '' : String(valor).replace('.', ','))

const dataHora = (iso: string | null) =>
  iso
    ? new Date(iso)
        .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        .replace(', ', ' ')
    : ''

function celula(valor: string) {
  // O Excel executa como fórmula o texto que começa com =, +, - ou @. Como cliente, endereço
  // e motivo são digitados por usuários, um apóstrofo na frente impede a execução.
  let texto = /^[=+\-@]/.test(valor) ? `'${valor}` : valor
  if (/[;"\r\n]/.test(texto)) texto = `"${texto.replaceAll('"', '""')}"`
  return texto
}

function linhaDaPlanilha(l: LinhaRelatorio) {
  return [
    String(l.id),
    formatarData(l.dataColeta),
    l.cliente,
    l.enderecoColeta,
    l.motorista ?? '',
    l.placa ? formatarPlaca(l.placa) : '',
    ROTULO_STATUS[l.status],
    numero(l.pesoEstimadoKg),
    numero(l.pesoRealKg),
    l.distanciaMetros == null ? '' : numero(Math.round(l.distanciaMetros / 10) / 100),
    l.duracaoSegundos == null ? '' : String(Math.round(l.duracaoSegundos / 60)),
    dataHora(l.inicio),
    dataHora(l.fim),
    l.motivo ?? '',
  ]
    .map(celula)
    .join(';')
}

// Planilha CSV no formato do Excel em português: ponto e vírgula como separador e a marca de
// UTF-8 no começo, para os acentos aparecerem certos (RF15).
export function planilhaDeColetas(linhas: LinhaRelatorio[]) {
  return '﻿' + [CABECALHO.join(';'), ...linhas.map(linhaDaPlanilha)].join('\r\n')
}

export function nomeDaPlanilha(de: string, ate: string) {
  return `coletas_${de}_a_${ate}.csv`
}

export function baixarArquivo(conteudo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
}
