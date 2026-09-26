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

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  corpo?: unknown
}

export async function api<T>(caminho: string, { metodo = 'GET', corpo }: Opcoes = {}): Promise<T> {
  const sessao = lerSessao()
  const headers: Record<string, string> = {}
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  if (sessao) headers.Authorization = `Bearer ${sessao.token}`

  let resposta: Response
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet e tente novamente.')
  }

  if (resposta.status === 401 && sessao) aoExpirarSessao?.()

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => null)
    const mensagem = Array.isArray(erro?.message)
      ? erro.message.join('\n')
      : (erro?.message ?? `Erro ${resposta.status}`)
    throw new ApiError(resposta.status, mensagem)
  }

  return resposta.status === 204 ? (undefined as T) : resposta.json()
}

export function montarQuery(parametros: Record<string, string | number | boolean | undefined>) {
  const busca = new URLSearchParams()
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== '') busca.set(chave, String(valor))
  }
  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}
