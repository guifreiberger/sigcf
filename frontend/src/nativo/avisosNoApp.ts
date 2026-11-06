import { PushNotifications } from '@capacitor/push-notifications'
import { api } from '../api/cliente.ts'

export type EstadoAvisosNoApp = 'ativo' | 'negado'

// Dentro do app Android o Web Push do navegador não funciona: os avisos chegam pelo Firebase.
// Pede a permissão, cria o canal "coletas" (o mesmo que o servidor usa) e registra o aparelho
// com o token do Firebase. Roda a cada abertura, porque o Firebase pode trocar o token.
export async function ativarAvisosNoApp(aoChegarAviso: () => void): Promise<EstadoAvisosNoApp> {
  let { receive } = await PushNotifications.checkPermissions()
  if (receive === 'prompt' || receive === 'prompt-with-rationale') {
    ;({ receive } = await PushNotifications.requestPermissions())
  }
  if (receive !== 'granted') return 'negado'

  await PushNotifications.createChannel({
    id: 'coletas',
    name: 'Coletas',
    description: 'Coletas novas, disponíveis e canceladas',
    importance: 5,
    visibility: 1,
    vibration: true,
  })
  await PushNotifications.removeAllListeners()
  await PushNotifications.addListener('registration', ({ value }) => {
    // Se falhar, tenta de novo na próxima abertura do app.
    void api('/notificacoes/aparelhos', { metodo: 'POST', corpo: { token: value } }).catch(() => undefined)
  })
  await PushNotifications.addListener('pushNotificationReceived', aoChegarAviso)
  await PushNotifications.addListener('pushNotificationActionPerformed', aoChegarAviso)
  await PushNotifications.register()
  return 'ativo'
}

// Ao sair da conta, apaga o token no Firebase: o aparelho para de receber os avisos de quem
// saiu, e o servidor descarta o token no próximo envio. Não depende da sessão, que pode ter expirado.
export async function desligarAvisosNoApp() {
  await PushNotifications.removeAllListeners()
  await PushNotifications.unregister()
}
