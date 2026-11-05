import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'
import { registerPlugin } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export interface LeituraGps {
  latitude: number
  longitude: number
  precisaoMetros: number
  // Momento da leitura no aparelho, em milissegundos.
  registradoEm: number
}

export type FalhaGps = 'sem-permissao' | 'outro'

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')

// No Android 13 ou superior, a notificação fixa do rastreamento só aparece com essa permissão.
// Sem ela o GPS funciona do mesmo jeito, então uma falha aqui não impede a coleta.
async function pedirPermissaoDeNotificacao() {
  try {
    const { display } = await LocalNotifications.checkPermissions()
    if (display !== 'granted') await LocalNotifications.requestPermissions()
  } catch {
    // Segue sem a notificação visível.
  }
}

// Liga o GPS do app Android, que continua entregando posições com a tela apagada ou com o
// motorista em outro app, enquanto o Android mostra uma notificação fixa. Devolve a função
// que desliga; ela funciona mesmo se for chamada antes de o GPS terminar de ligar.
export function acompanharEmSegundoPlano(
  aoLer: (leitura: LeituraGps) => void,
  aoFalhar: (motivo: FalhaGps) => void,
): () => void {
  let encerrado = false

  const vigia = (async () => {
    await pedirPermissaoDeNotificacao()
    if (encerrado) return null
    return BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: 'SIGCF: coleta em andamento',
        backgroundMessage: 'Sua localização é enviada ao gestor até você concluir a coleta.',
        requestPermissions: true,
        stale: false,
        distanceFilter: 0,
      },
      (local, erro) => {
        if (encerrado) return
        if (erro) {
          aoFalhar(erro.code === 'NOT_AUTHORIZED' ? 'sem-permissao' : 'outro')
          return
        }
        if (local) {
          aoLer({
            latitude: local.latitude,
            longitude: local.longitude,
            precisaoMetros: local.accuracy,
            registradoEm: local.time ?? Date.now(),
          })
        }
      },
    )
  })()

  return () => {
    encerrado = true
    void vigia.then((id) => {
      if (id) void BackgroundGeolocation.removeWatcher({ id })
    })
  }
}

export function abrirConfiguracoesDoApp() {
  return BackgroundGeolocation.openSettings()
}
