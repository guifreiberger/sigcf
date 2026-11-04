import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../api/cliente.ts'
import type { PontoTrajeto } from '../../api/tipos.ts'

const INTERVALO_ENVIO_MS = 15_000
// Uma leitura a cada 10 s desenha bem o trajeto sem gastar bateria e dados à toa.
const INTERVALO_LEITURA_MS = 10_000
const LOTE_MAXIMO = 200
// Cerca de 5 horas sem sinal; acima disso as leituras mais antigas são descartadas.
const LIMITE_PENDENTES = 2_000
const CHAVE_PENDENTES = 'sigcf.trajeto.pendentes'
const ERRO_TEMPO_ESGOTADO = 3

export type EstadoRastreamento = 'desligado' | 'aguardando-gps' | 'compartilhando' | 'sem-gps'

function lerPendentes(): PontoTrajeto[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PENDENTES) ?? '[]')
  } catch {
    return []
  }
}

function salvarPendentes(pontos: PontoTrajeto[]) {
  try {
    if (pontos.length) localStorage.setItem(CHAVE_PENDENTES, JSON.stringify(pontos))
    else localStorage.removeItem(CHAVE_PENDENTES)
  } catch {
    // Sem armazenamento (ex.: aba anônima cheia): as leituras ficam só na memória.
  }
}

const arredondar = (valor: number) => Number(valor.toFixed(6))

// Compartilha a posição do motorista com o gestor enquanto houver coleta em andamento (RF11).
// As leituras ficam numa fila salva no aparelho e são enviadas em lotes, para não se perderem
// quando o sinal cai no caminho.
export function useRastreamento(ativo: boolean) {
  const [filaInicial] = useState(lerPendentes)
  const fila = useRef(filaInicial)
  const [pendentes, setPendentes] = useState(filaInicial.length)
  const [leitura, setLeitura] = useState<'aguardando-gps' | 'compartilhando' | 'sem-gps'>('aguardando-gps')
  const envio = useRef<Promise<void> | null>(null)

  const atualizarFila = useCallback((pontos: PontoTrajeto[]) => {
    fila.current = pontos.slice(-LIMITE_PENDENTES)
    salvarPendentes(fila.current)
    setPendentes(fila.current.length)
  }, [])

  const enviarPendentes = useCallback(() => {
    envio.current ??= (async () => {
      try {
        while (fila.current.length) {
          const lote = fila.current.slice(0, LOTE_MAXIMO)
          try {
            await api('/rastreamento/pontos', { metodo: 'POST', corpo: { pontos: lote } })
          } catch (erro) {
            // Sem conexão ou servidor fora do ar: o lote fica para o próximo ciclo.
            if (!(erro instanceof ApiError) || erro.status === 0 || erro.status >= 500) return
            // Recusado (ex.: a coleta já terminou): reenviar não adiantaria, então descarta.
          }
          atualizarFila(fila.current.slice(lote.length))
        }
      } finally {
        envio.current = null
      }
    })()
    return envio.current
  }, [atualizarFila])

  useEffect(() => {
    if (!ativo || !('geolocation' in navigator)) return
    const { geolocation } = navigator
    let ultimaLeitura = -Infinity
    const vigia = geolocation.watchPosition(
      ({ coords, timestamp }) => {
        setLeitura('compartilhando')
        if (timestamp - ultimaLeitura < INTERVALO_LEITURA_MS) return
        ultimaLeitura = timestamp
        atualizarFila([
          ...fila.current,
          {
            latitude: arredondar(coords.latitude),
            longitude: arredondar(coords.longitude),
            precisaoMetros: Math.round(coords.accuracy),
            registradoEm: new Date(timestamp).toISOString(),
          },
        ])
      },
      (erro) => setLeitura(erro.code === ERRO_TEMPO_ESGOTADO ? 'aguardando-gps' : 'sem-gps'),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    )
    const ciclo = setInterval(() => void enviarPendentes(), INTERVALO_ENVIO_MS)
    return () => {
      geolocation.clearWatch(vigia)
      clearInterval(ciclo)
      setLeitura('aguardando-gps')
    }
  }, [ativo, atualizarFila, enviarPendentes])

  // O navegador para o GPS quando a tela apaga; a trava mantém a tela ligada durante a coleta.
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return
    let trava: WakeLockSentinel | undefined
    let encerrado = false
    const pedir = () =>
      navigator.wakeLock
        .request('screen')
        .then((nova) => {
          if (encerrado) void nova.release()
          else trava = nova
        })
        .catch(() => undefined) // Economia de bateria ativa ou aba em segundo plano.
    // A trava cai sozinha quando o app sai da tela; ao voltar, pede de novo.
    const aoVoltar = () => document.visibilityState === 'visible' && void pedir()

    void pedir()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      encerrado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      void trava?.release()
    }
  }, [ativo])

  const estado: EstadoRastreamento = !ativo
    ? 'desligado'
    : 'geolocation' in navigator
      ? leitura
      : 'sem-gps'

  return { estado, pendentes, enviarPendentes }
}
