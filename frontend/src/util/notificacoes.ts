import { api } from '../api/cliente.ts'

export type EstadoAvisos = 'indisponivel' | 'bloqueado' | 'ativo' | 'inativo'

function chaveParaBytes(base64Url: string) {
  const preenchida = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)
  const binario = atob(preenchida.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

// Sem service worker registrado (ex.: modo de desenvolvimento) não há como receber push.
async function registroDoApp() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return null
  }
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export function precisaInstalarNoIphone() {
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const instalado = window.matchMedia('(display-mode: standalone)').matches
  return iphone && !instalado
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  const registro = await registroDoApp()
  if (!registro) return 'indisponivel'
  if (Notification.permission === 'denied') return 'bloqueado'
  const inscricao = await registro.pushManager.getSubscription()
  return inscricao && Notification.permission === 'granted' ? 'ativo' : 'inativo'
}

export async function ativarAvisos(): Promise<EstadoAvisos> {
  const registro = await registroDoApp()
  if (!registro) return 'indisponivel'

  const permissao = await Notification.requestPermission()
  if (permissao === 'denied') return 'bloqueado'
  if (permissao !== 'granted') return 'inativo'

  const { chavePublica } = await api<{ chavePublica: string | null }>('/notificacoes/chave-publica')
  if (!chavePublica) return 'indisponivel'

  const inscricao =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveParaBytes(chavePublica),
    }))
  const { endpoint, keys } = inscricao.toJSON()
  await api('/notificacoes/inscricoes', { metodo: 'POST', corpo: { endpoint, keys } })
  return 'ativo'
}

export async function desativarAvisos() {
  const inscricao = await (await registroDoApp())?.pushManager.getSubscription()
  if (!inscricao) return
  await api('/notificacoes/inscricoes', { metodo: 'DELETE', corpo: { endpoint: inscricao.endpoint } })
  await inscricao.unsubscribe()
}

// Ao sair, cancela só no aparelho: o servidor apaga a inscrição quando o serviço de push
// informar que ela expirou. Não chama a API porque a sessão pode já estar expirada.
export async function cancelarInscricaoDoAparelho() {
  const inscricao = await (await registroDoApp())?.pushManager.getSubscription()
  await inscricao?.unsubscribe()
}
