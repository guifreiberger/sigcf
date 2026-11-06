import { CapacitorHttp } from '@capacitor/core'
import { ehAppNativo } from '../nativo/plataforma.ts'
import type { Sessao } from './tipos.ts'

const CHAVE_SESSAO = 'sigcf.sessao'

export class ApiError extends Error {
  status: number

  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

let aoExpirarSessao: (() => void) | null = null

export function definirAoExpirarSessao(callback: () => void) {
  aoExpirarSessao = callback
}

export function lerSessao(): Sessao | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? 'null')
  } catch {
    return null
  }
}

export function salvarSessao(sessao: Sessao | null) {
  if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
  else localStorage.removeItem(CHAVE_SESSAO)
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface Opcoes {
  metodo?: Metodo
  corpo?: unknown
}

interface Resposta {
  status: number
  json: () => Promise<unknown>
}

// No navegador a API fica no mesmo endereço do site; o app Android traz o endereço completo
// da API do seu ambiente (homologação ou produção), definido ao gerar o app.
export const enderecoDaApi = () => import.meta.env.VITE_API_URL || '/api'

// Sem tempo-limite, o HTTP nativo do Android espera para sempre por uma conexão que caiu, como
// ao trocar do Wi-Fi para o 4G, e a fila do trajeto deixa de ser enviada até o app ser fechado.
const TEMPO_CONEXAO_MS = 15_000
const TEMPO_RESPOSTA_MS = 20_000

// No app Android, as chamadas saem pelo HTTP nativo: depois de alguns minutos em segundo plano,
// o Android limita a internet da WebView, e o trajeto precisa continuar sendo enviado.
async function transportar(url: string, metodo: Metodo, headers: Record<string, string>, corpo: unknown) {
  if (ehAppNativo()) {
    const { status, data } = await CapacitorHttp.request({
      url,
      method: metodo,
      headers,
      data: corpo,
      connectTimeout: TEMPO_CONEXAO_MS,
      readTimeout: TEMPO_RESPOSTA_MS,
    })
    return {
      status,
      json: async () => (typeof data === 'string' ? JSON.parse(data || 'null') : data),
    } satisfies Resposta
  }
  const resposta = await fetch(url, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  return { status: resposta.status, json: () => resposta.json() } satisfies Resposta
}

export async function api<T>(caminho: string, { metodo = 'GET', corpo }: Opcoes = {}): Promise<T> {
  const sessao = lerSessao()
  const headers: Record<string, string> = {}
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  if (sessao) headers.Authorization = `Bearer ${sessao.token}`

  let resposta: Resposta
  try {
    resposta = await transportar(`${enderecoDaApi()}${caminho}`, metodo, headers, corpo)
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet e tente novamente.')
  }

  if (resposta.status === 401 && sessao) aoExpirarSessao?.()

  if (resposta.status < 200 || resposta.status >= 300) {
    const erro = (await resposta.json().catch(() => null)) as { message?: string | string[] } | null
    const mensagem = Array.isArray(erro?.message)
      ? erro.message.join('\n')
      : (erro?.message ?? `Erro ${resposta.status}`)
    throw new ApiError(resposta.status, mensagem)
  }

  return resposta.status === 204 ? (undefined as T) : ((await resposta.json()) as T)
}

export function montarQuery(parametros: Record<string, string | number | boolean | undefined>) {
  const busca = new URLSearchParams()
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== '') busca.set(chave, String(valor))
  }
  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}
