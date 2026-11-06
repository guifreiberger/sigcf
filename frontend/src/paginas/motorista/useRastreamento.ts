import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../api/cliente.ts'
import type { PontoTrajeto } from '../../api/tipos.ts'
import { acompanharEmSegundoPlano, type LeituraGps } from '../../nativo/gpsEmSegundoPlano.ts'
import { ehAppNativo } from '../../nativo/plataforma.ts'

const INTERVALO_ENVIO_MS = 15_000
// Uma leitura a cada 10 s desenha bem o trajeto sem gastar bateria e dados à toa.
const INTERVALO_LEITURA_MS = 10_000
const LOTE_MAXIMO = 200
// Cerca de 5 horas sem sinal; acima disso as leituras mais antigas são descartadas.
const LIMITE_PENDENTES = 2_000
const CHAVE_PENDENTES = 'sigcf.trajeto.pendentes'
const ERRO_TEMPO_ESGOTADO = 3
// Sem leitura nesse tempo, o acompanhamento contínuo provavelmente parou (ver abaixo).
const SEM_LEITURA_MS = 20_000
// Sem leitura nesse tempo, o motorista é avisado de que a posição não está sendo enviada.
const SEM_SINAL_MS = 30_000
const OPCOES_GPS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 }
const OPCOES_AVULSA: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 }

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
// quando o sinal cai no caminho. No app Android, o GPS segue com a tela apagada; no navegador,
// só com o app aberto.
export function useRastreamento(ativo: boolean, aoEncerrarNoServidor?: () => void) {
  const [filaInicial] = useState(lerPendentes)
  const fila = useRef(filaInicial)
  const [pendentes, setPendentes] = useState(filaInicial.length)
  const [leitura, setLeitura] = useState<'aguardando-gps' | 'compartilhando' | 'sem-gps'>('aguardando-gps')
  const envio = useRef<Promise<void> | null>(null)
  const ultimaLeitura = useRef(-Infinity)
  const ultimoEnvio = useRef(0)
  const aoEncerrar = useRef(aoEncerrarNoServidor)
  useEffect(() => {
    aoEncerrar.current = aoEncerrarNoServidor
  })

  const atualizarFila = useCallback((pontos: PontoTrajeto[]) => {
    fila.current = pontos.slice(-LIMITE_PENDENTES)
    salvarPendentes(fila.current)
    setPendentes(fila.current.length)
  }, [])

  const enviarPendentes = useCallback(() => {
    ultimoEnvio.current = Date.now()
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
            if (erro.status === 409) aoEncerrar.current?.()
          }
          atualizarFila(fila.current.slice(lote.length))
        }
      } finally {
        envio.current = null
      }
    })()
    return envio.current
  }, [atualizarFila])

  // Guarda no máximo uma leitura a cada 10 s e, passados 15 s do último envio, já envia.
  // Enviar a partir da própria leitura importa no app: em segundo plano o Android congela os
  // relógios da tela, mas o GPS continua chamando esta função.
  const guardar = useCallback(
    ({ latitude, longitude, precisaoMetros, registradoEm }: LeituraGps) => {
      setLeitura('compartilhando')
      if (registradoEm - ultimaLeitura.current < INTERVALO_LEITURA_MS) return
      ultimaLeitura.current = registradoEm
      atualizarFila([
        ...fila.current,
        {
          latitude: arredondar(latitude),
          longitude: arredondar(longitude),
          precisaoMetros: Math.round(precisaoMetros),
          registradoEm: new Date(registradoEm).toISOString(),
        },
      ])
      if (Date.now() - ultimoEnvio.current >= INTERVALO_ENVIO_MS) void enviarPendentes()
    },
    [atualizarFila, enviarPendentes],
  )

  // App Android: o plugin mantém o GPS ligado em segundo plano, com uma notificação fixa.
  useEffect(() => {
    if (!ativo || !ehAppNativo()) return
    ultimoEnvio.current = Date.now()
    const parar = acompanharEmSegundoPlano(guardar, (motivo) =>
      setLeitura(motivo === 'sem-permissao' ? 'sem-gps' : 'aguardando-gps'),
    )
    const ciclo = setInterval(() => void enviarPendentes(), INTERVALO_ENVIO_MS)
    return () => {
      parar()
      clearInterval(ciclo)
      setLeitura('aguardando-gps')
    }
  }, [ativo, guardar, enviarPendentes])

  // Navegador: GPS só com o app aberto, com recuperação quando o celular para de entregar.
  useEffect(() => {
    if (!ativo || ehAppNativo() || !('geolocation' in navigator)) return
    const { geolocation } = navigator
    let ultimaChegada = Date.now()
    ultimoEnvio.current = Date.now()

    const registrar = ({ coords, timestamp }: GeolocationPosition) => {
      ultimaChegada = Date.now()
      guardar({
        latitude: coords.latitude,
        longitude: coords.longitude,
        precisaoMetros: coords.accuracy,
        registradoEm: timestamp,
      })
    }
    const aoFalhar = (erro: GeolocationPositionError) =>
      setLeitura(erro.code === ERRO_TEMPO_ESGOTADO ? 'aguardando-gps' : 'sem-gps')

    let vigia = geolocation.watchPosition(registrar, aoFalhar, OPCOES_GPS)
    const recomecar = () => {
      geolocation.clearWatch(vigia)
      vigia = geolocation.watchPosition(registrar, aoFalhar, OPCOES_GPS)
      geolocation.getCurrentPosition(registrar, aoFalhar, OPCOES_AVULSA)
    }

    // Num Android real, depois que a tela apagou ou o app saiu da frente, o acompanhamento
    // contínuo parou de entregar leituras sem avisar, enquanto o pedido avulso de posição
    // seguia funcionando. Sem leitura há 20 s, o acompanhamento é refeito e uma posição
    // avulsa é pedida; assim o trajeto continua sendo desenhado mesmo nesse caso.
    const verificar = () => {
      const semLeitura = Date.now() - ultimaChegada
      if (semLeitura < SEM_LEITURA_MS) return
      if (semLeitura >= SEM_SINAL_MS) setLeitura('aguardando-gps')
      recomecar()
    }
    const aoVoltar = () => document.visibilityState === 'visible' && recomecar()

    const ciclos = [
      setInterval(() => void enviarPendentes(), INTERVALO_ENVIO_MS),
      setInterval(verificar, INTERVALO_LEITURA_MS),
    ]
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      geolocation.clearWatch(vigia)
      ciclos.forEach(clearInterval)
      document.removeEventListener('visibilitychange', aoVoltar)
      setLeitura('aguardando-gps')
    }
  }, [ativo, guardar, enviarPendentes])

  // O navegador para o GPS quando a tela apaga; a trava mantém a tela ligada durante a coleta.
  useEffect(() => {
    if (!ativo || ehAppNativo() || !('wakeLock' in navigator)) return
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
    : ehAppNativo() || 'geolocation' in navigator
      ? leitura
      : 'sem-gps'

  return { estado, pendentes, enviarPendentes }
}
