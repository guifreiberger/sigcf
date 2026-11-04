import { vi } from 'vitest'

type Resposta = { status?: number; corpo?: unknown }
type Rota = Resposta | ((corpo: unknown) => Resposta)

// Substitui o fetch por respostas fixas, indexadas por "MÉTODO /caminho".
export function apiFalsa(rotas: Record<string, Rota>) {
  const fetchFalso = vi.fn(async (url: string, init: RequestInit = {}) => {
    const chave = `${init.method ?? 'GET'} ${url.replace(/^\/api/, '')}`
    const rota = rotas[chave]
    if (!rota) throw new Error(`Rota não simulada no teste: ${chave}`)
    const corpo = init.body ? JSON.parse(String(init.body)) : undefined
    const { status = 200, corpo: resposta } = typeof rota === 'function' ? rota(corpo) : rota
    return new Response(status === 204 ? null : JSON.stringify(resposta ?? null), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

// Corpo JSON enviado na chamada que corresponde a "MÉTODO /caminho".
export function corpoEnviado(fetchFalso: ReturnType<typeof apiFalsa>, chave: string) {
  const chamada = fetchFalso.mock.calls.find(
    ([url, init]) => `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '')}` === chave,
  )
  return chamada?.[1]?.body ? JSON.parse(String(chamada[1].body)) : undefined
}
