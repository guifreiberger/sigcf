import { CapacitorHttp } from '@capacitor/core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { salvarSessao } from '../../api/cliente.ts'
import * as servicoNativo from '../../nativo/rastreamento.ts'
import { sessaoDe } from '../../testes/renderizar.tsx'
import { useRastreamento } from './useRastreamento.ts'

// Por padrão os testes rodam como no navegador; o bloco "no app Android" liga o modo nativo.
// Lá, o serviço do app é falso e o teste decide o estado que ele informa.
const nativo = vi.hoisted(() => ({
  ligado: false,
  estado: { ativo: false, pendentes: 0, ultimaLeitura: null as number | null, encerradaNoServidor: false },
}))
vi.mock('../../nativo/plataforma.ts', () => ({ ehAppNativo: () => nativo.ligado }))
vi.mock('../../nativo/rastreamento.ts', () => ({
  iniciarRastreamentoNativo: vi.fn(async () => undefined),
  pararRastreamentoNativo: vi.fn(async () => undefined),
  estadoDoRastreamentoNativo: vi.fn(async () => ({ ...nativo.estado })),
  enviarPendentesNativos: vi.fn(async () => ({ pendentes: 0 })),
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  CapacitorHttp: { request: vi.fn() },
}))

const CHAVE_PENDENTES = 'sigcf.trajeto.pendentes'
const INICIO = Date.parse('2026-11-04T15:00:00Z')

// GPS falso: o teste decide quando chega cada leitura.
function gpsFalso() {
  const gps = {
    aoLer: null as PositionCallback | null,
    aoFalhar: null as PositionErrorCallback | null,
    aoLerAvulsa: null as PositionCallback | null,
    watchPosition: vi.fn((aoLer: PositionCallback, aoFalhar: PositionErrorCallback, _opcoes?: PositionOptions) => {
      gps.aoLer = aoLer
      gps.aoFalhar = aoFalhar
      return 42
    }),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn((aoLer: PositionCallback, _aoFalhar?: PositionErrorCallback, _opcoes?: PositionOptions) => {
      gps.aoLerAvulsa = aoLer
    }),
    // Resposta do pedido avulso de posição, que continua funcionando quando o acompanhamento para.
    lerAvulsa(latitude: number, segundos: number) {
      act(() =>
        gps.aoLerAvulsa?.({
          coords: { latitude, longitude: -49.0713456, accuracy: 6 },
          timestamp: INICIO + segundos * 1000,
        } as GeolocationPosition),
      )
    },
    ler(latitude: number, segundos: number, accuracy = 7.6) {
      act(() =>
        gps.aoLer?.({
          coords: { latitude, longitude: -49.0713456, accuracy },
          timestamp: INICIO + segundos * 1000,
        } as GeolocationPosition),
      )
    },
  }
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: gps })
  return gps
}

function telaFalsa() {
  const trava = { release: vi.fn().mockResolvedValue(undefined) }
  const wakeLock = { request: vi.fn().mockResolvedValue(trava) }
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: wakeLock })
  return { wakeLock, trava }
}

function servidorQueResponde(...status: (number | 'offline')[]) {
  const fetchFalso = vi.fn(async () => {
    const proximo = status.length > 1 ? status.shift() : status[0]
    if (proximo === 'offline') throw new TypeError('Failed to fetch')
    return new Response(proximo === 204 ? null : '{"message":"Nenhuma coleta em andamento."}', {
      status: proximo,
    })
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

const pontosEnviados = (fetchFalso: ReturnType<typeof servidorQueResponde>, chamada = 0) =>
  JSON.parse(String((fetchFalso.mock.calls[chamada] as unknown as [string, RequestInit])[1].body)).pontos

describe('useRastreamento', () => {
  let gps: ReturnType<typeof gpsFalso>

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(INICIO)
    salvarSessao(sessaoDe('MOTORISTA'))
    gps = gpsFalso()
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(navigator, 'geolocation')
    Reflect.deleteProperty(navigator, 'wakeLock')
  })

  it('fica desligado sem coleta em andamento', () => {
    const { wakeLock } = telaFalsa()
    const { result } = renderHook(() => useRastreamento(false))

    expect(result.current.estado).toBe('desligado')
    expect(gps.watchPosition).not.toHaveBeenCalled()
    expect(wakeLock.request).not.toHaveBeenCalled()
  })

  it('ao iniciar a coleta, acompanha o GPS com alta precisão e mantém a tela ligada', () => {
    const { wakeLock } = telaFalsa()
    const { result } = renderHook(() => useRastreamento(true))

    expect(result.current.estado).toBe('aguardando-gps')
    expect(gps.watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true })
    expect(wakeLock.request).toHaveBeenCalledWith('screen')
  })

  it('guarda no máximo uma leitura a cada 10 s e envia em lote a cada 15 s', async () => {
    const fetchFalso = servidorQueResponde(204)
    const { result } = renderHook(() => useRastreamento(true))

    gps.ler(-26.4851234567, 0)
    gps.ler(-26.4851, 3)
    gps.ler(-26.4849, 12, 20.2)
    expect(result.current).toMatchObject({ estado: 'compartilhando', pendentes: 2 })

    await act(() => vi.advanceTimersByTimeAsync(15_000))

    expect(fetchFalso).toHaveBeenCalledWith('/api/rastreamento/pontos', expect.objectContaining({ method: 'POST' }))
    expect(pontosEnviados(fetchFalso)).toEqual([
      { latitude: -26.485123, longitude: -49.071346, precisaoMetros: 8, registradoEm: '2026-11-04T15:00:00.000Z' },
      { latitude: -26.4849, longitude: -49.071346, precisaoMetros: 20, registradoEm: '2026-11-04T15:00:12.000Z' },
    ])
    expect(result.current.pendentes).toBe(0)
  })

  it('guarda as leituras quando falta sinal e reenvia no ciclo seguinte', async () => {
    const fetchFalso = servidorQueResponde('offline', 204)
    const { result } = renderHook(() => useRastreamento(true))

    gps.ler(-26.4851, 0)
    await act(() => vi.advanceTimersByTimeAsync(15_000))
    expect(result.current.pendentes).toBe(1)
    expect(JSON.parse(localStorage.getItem(CHAVE_PENDENTES) ?? '[]')).toHaveLength(1)

    gps.ler(-26.4849, 20)
    await act(() => vi.advanceTimersByTimeAsync(15_000))

    expect(pontosEnviados(fetchFalso, 1)).toHaveLength(2)
    expect(result.current.pendentes).toBe(0)
    expect(localStorage.getItem(CHAVE_PENDENTES)).toBeNull()
  })

  it('descarta as leituras quando o servidor informa que não há coleta em andamento', async () => {
    servidorQueResponde(409)
    const { result } = renderHook(() => useRastreamento(true))

    gps.ler(-26.4851, 0)
    await act(() => vi.advanceTimersByTimeAsync(15_000))

    expect(result.current.pendentes).toBe(0)
  })

  it('envia na hora quando o motorista vai concluir a coleta', async () => {
    const fetchFalso = servidorQueResponde(204)
    const { result } = renderHook(() => useRastreamento(true))

    gps.ler(-26.4851, 0)
    await act(() => result.current.enviarPendentes())

    expect(pontosEnviados(fetchFalso)).toHaveLength(1)
    expect(result.current.pendentes).toBe(0)
  })

  it('retoma as leituras que ficaram de uma sessão anterior', () => {
    localStorage.setItem(
      CHAVE_PENDENTES,
      JSON.stringify([{ latitude: -26.48, longitude: -49.07, precisaoMetros: 5, registradoEm: '2026-11-04T14:50:00.000Z' }]),
    )

    const { result } = renderHook(() => useRastreamento(true))

    expect(result.current.pendentes).toBe(1)
  })

  it.each([
    [1, 'sem-gps'],
    [2, 'sem-gps'],
    [3, 'aguardando-gps'],
  ])('com o erro de GPS %i fica %s', (code, estado) => {
    const { result } = renderHook(() => useRastreamento(true))

    act(() => gps.aoFalhar?.({ code } as GeolocationPositionError))

    expect(result.current.estado).toBe(estado)
  })

  it('ao terminar a coleta, para o GPS e libera a tela', async () => {
    const { trava } = telaFalsa()
    const { result, rerender } = renderHook(({ ativo }) => useRastreamento(ativo), {
      initialProps: { ativo: true },
    })
    await act(() => Promise.resolve())

    rerender({ ativo: false })

    expect(gps.clearWatch).toHaveBeenCalledWith(42)
    expect(trava.release).toHaveBeenCalled()
    expect(result.current.estado).toBe('desligado')
  })

  it('funciona sem a trava de tela em navegadores que não a suportam', () => {
    const { result } = renderHook(() => useRastreamento(true))

    expect(result.current.estado).toBe('aguardando-gps')
  })

  describe('quando o celular para de entregar as leituras sem avisar', () => {
    // Visto num Android real: depois de a tela apagar ou o app sair da frente, o acompanhamento
    // contínuo parou para sempre, enquanto o pedido avulso de posição seguia funcionando.
    function voltarParaOApp() {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      act(() => document.dispatchEvent(new Event('visibilitychange')))
    }

    afterEach(() => Reflect.deleteProperty(document, 'visibilityState'))

    it('não pede posição avulsa enquanto as leituras continuam chegando', async () => {
      servidorQueResponde(204)
      renderHook(() => useRastreamento(true))

      for (let segundos = 0; segundos <= 40; segundos += 10) {
        vi.setSystemTime(INICIO + segundos * 1000)
        gps.ler(-26.4851 + segundos / 100_000, segundos)
        await act(() => vi.advanceTimersByTimeAsync(0))
      }
      await act(() => vi.advanceTimersByTimeAsync(10_000))

      expect(gps.getCurrentPosition).not.toHaveBeenCalled()
    })

    it('pede uma posição avulsa e guarda a leitura, para o trajeto não ficar vazio', async () => {
      servidorQueResponde(409)
      const { result } = renderHook(() => useRastreamento(true))
      gps.ler(-26.4851, 0)

      await act(() => vi.advanceTimersByTimeAsync(20_000))

      expect(gps.getCurrentPosition).toHaveBeenCalledTimes(1)
      expect(gps.getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true })
      gps.lerAvulsa(-26.4849, 20)
      expect(result.current).toMatchObject({ estado: 'compartilhando', pendentes: 1 })
    })

    it('reinicia o acompanhamento contínuo, que pode ter morrido', async () => {
      servidorQueResponde(204)
      renderHook(() => useRastreamento(true))

      await act(() => vi.advanceTimersByTimeAsync(20_000))

      expect(gps.clearWatch).toHaveBeenCalledWith(42)
      expect(gps.watchPosition).toHaveBeenCalledTimes(2)
    })

    it('deixa de dizer que está compartilhando quando não chega nenhuma posição', async () => {
      servidorQueResponde(204)
      const { result } = renderHook(() => useRastreamento(true))
      gps.ler(-26.4851, 0)
      expect(result.current.estado).toBe('compartilhando')

      await act(() => vi.advanceTimersByTimeAsync(30_000))

      expect(result.current.estado).toBe('aguardando-gps')
    })

    it('reinicia o acompanhamento e pede a posição assim que o motorista volta para o app', () => {
      renderHook(() => useRastreamento(true))

      voltarParaOApp()

      expect(gps.clearWatch).toHaveBeenCalledWith(42)
      expect(gps.watchPosition).toHaveBeenCalledTimes(2)
      expect(gps.getCurrentPosition).toHaveBeenCalledTimes(1)
    })
  })

  it('avisa a tela quando o servidor diz que a coleta já terminou, para parar o rastreamento', async () => {
    servidorQueResponde(409)
    const aoEncerrar = vi.fn()
    renderHook(() => useRastreamento(true, aoEncerrar))

    gps.ler(-26.4851, 0)
    await act(() => vi.advanceTimersByTimeAsync(15_000))

    expect(aoEncerrar).toHaveBeenCalledOnce()
  })

  describe('no app Android', () => {
    const httpNativo = vi.mocked(CapacitorHttp.request)
    const servico = vi.mocked(servicoNativo)
    // Deixa as consultas ao serviço falso terminarem.
    const esperar = () => act(() => vi.advanceTimersByTimeAsync(0))

    beforeEach(() => {
      vi.clearAllMocks()
      nativo.ligado = true
      nativo.estado = { ativo: true, pendentes: 0, ultimaLeitura: null, encerradaNoServidor: false }
      vi.stubEnv('VITE_API_URL', 'https://sigcf.exemplo/api')
      httpNativo.mockResolvedValue({ status: 204, data: '', headers: {}, url: '' })
    })

    afterEach(() => {
      nativo.ligado = false
      httpNativo.mockReset()
      vi.unstubAllEnvs()
    })

    it('liga o serviço do app com o endereço da API e a sessão, sem prender a tela nem usar o GPS do navegador', async () => {
      const { wakeLock } = telaFalsa()
      const { result } = renderHook(() => useRastreamento(true))
      await esperar()

      expect(servico.iniciarRastreamentoNativo).toHaveBeenCalledWith('https://sigcf.exemplo/api', 'token-motorista')
      expect(gps.watchPosition).not.toHaveBeenCalled()
      expect(wakeLock.request).not.toHaveBeenCalled()
      expect(result.current.estado).toBe('aguardando-gps')
    })

    it('mostra que compartilha enquanto o serviço recebe posições, e quantas aguardam envio', async () => {
      nativo.estado.pendentes = 3
      nativo.estado.ultimaLeitura = INICIO - 5_000
      const { result } = renderHook(() => useRastreamento(true))
      await esperar()

      expect(result.current).toMatchObject({ estado: 'compartilhando', pendentes: 3 })
    })

    it('consulta o serviço a cada 5 s e volta a procurar o GPS quando a última posição passa de 30 s', async () => {
      nativo.estado.ultimaLeitura = INICIO - 5_000
      const { result } = renderHook(() => useRastreamento(true))
      await esperar()
      expect(result.current.estado).toBe('compartilhando')

      await act(() => vi.advanceTimersByTimeAsync(30_000))

      expect(servico.estadoDoRastreamentoNativo.mock.calls.length).toBeGreaterThanOrEqual(7)
      expect(result.current.estado).toBe('aguardando-gps')
    })

    it('fica sem GPS quando o motorista não libera a localização', async () => {
      servico.iniciarRastreamentoNativo.mockRejectedValueOnce(Object.assign(new Error('negada'), { code: 'SEM_PERMISSAO' }))
      const { result } = renderHook(() => useRastreamento(true))
      await esperar()
      await act(() => vi.advanceTimersByTimeAsync(5_000))

      expect(result.current.estado).toBe('sem-gps')
    })

    it('tenta ligar de novo quando o motorista volta ao app depois de liberar a localização', async () => {
      servico.iniciarRastreamentoNativo.mockRejectedValueOnce(Object.assign(new Error('negada'), { code: 'SEM_PERMISSAO' }))
      const { result } = renderHook(() => useRastreamento(true))
      await esperar()
      expect(result.current.estado).toBe('sem-gps')

      act(() => document.dispatchEvent(new Event('visibilitychange')))
      await esperar()

      expect(servico.iniciarRastreamentoNativo).toHaveBeenCalledTimes(2)
      expect(result.current.estado).toBe('aguardando-gps')
    })

    it('desliga o serviço ao terminar a coleta', async () => {
      const { result, rerender } = renderHook(({ ativo }) => useRastreamento(ativo), {
        initialProps: { ativo: true },
      })
      await esperar()

      rerender({ ativo: false })
      await esperar()

      expect(servico.pararRastreamentoNativo).toHaveBeenCalledOnce()
      expect(result.current.estado).toBe('desligado')
    })

    // Ao reabrir o app no meio da coleta, a lista ainda está carregando e parece não haver
    // coleta em andamento; desligar aí abriria um buraco no trajeto.
    it('não desliga o serviço enquanto a lista de coletas carrega', async () => {
      renderHook(() => useRastreamento(false))
      await esperar()

      expect(servico.pararRastreamentoNativo).not.toHaveBeenCalled()
    })

    it('ao abrir o app fora de coleta, envia o que ficou guardado no aparelho', async () => {
      nativo.estado = { ativo: false, pendentes: 4, ultimaLeitura: INICIO - 60_000, encerradaNoServidor: false }
      servico.enviarPendentesNativos.mockResolvedValueOnce({ pendentes: 0 })
      const { result } = renderHook(() => useRastreamento(false))
      await esperar()

      expect(servico.enviarPendentesNativos).toHaveBeenCalled()
      expect(result.current.estado).toBe('desligado')
    })

    it('envia na hora o que o serviço guardou, quando o motorista vai concluir a coleta', async () => {
      nativo.estado.pendentes = 2
      const { result } = renderHook(() => useRastreamento(true))
      await esperar()
      expect(result.current.pendentes).toBe(2)

      servico.enviarPendentesNativos.mockResolvedValueOnce({ pendentes: 0 })
      await act(() => result.current.enviarPendentes())

      expect(servico.enviarPendentesNativos).toHaveBeenCalled()
      expect(result.current.pendentes).toBe(0)
    })

    it('avisa a tela quando o servidor encerrou a coleta, para atualizar a lista', async () => {
      nativo.estado.encerradaNoServidor = true
      const aoEncerrar = vi.fn()
      renderHook(() => useRastreamento(true, aoEncerrar))
      await esperar()

      expect(aoEncerrar).toHaveBeenCalled()
    })

    it('envia as posições que a versão anterior do app deixou guardadas na tela', async () => {
      localStorage.setItem(
        CHAVE_PENDENTES,
        JSON.stringify([{ latitude: -26.48, longitude: -49.07, precisaoMetros: 5, registradoEm: '2026-11-04T14:50:00.000Z' }]),
      )
      const { result } = renderHook(() => useRastreamento(true))
      await esperar()

      expect(httpNativo).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://sigcf.exemplo/api/rastreamento/pontos', method: 'POST' }),
      )
      expect(result.current.pendentes).toBe(0)
    })
  })

  it('informa quando o aparelho não tem GPS', () => {
    Reflect.deleteProperty(navigator, 'geolocation')

    const { result } = renderHook(() => useRastreamento(true))

    expect(result.current.estado).toBe('sem-gps')
  })
})
