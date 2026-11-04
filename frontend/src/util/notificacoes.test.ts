import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFalsa, corpoEnviado } from '../testes/apiFalsa.ts'
import {
  ativarAvisos,
  cancelarInscricaoDoAparelho,
  desativarAvisos,
  estadoAvisos,
  precisaInstalarNoIphone,
} from './notificacoes.ts'

const inscricao = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'p', auth: 'a' },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
}

// Simula o navegador com service worker, Push API e a permissão de notificação.
function navegadorComPush({
  permissao = 'default' as NotificationPermission,
  respostaAoPedido = 'granted' as NotificationPermission,
  inscrito = false,
} = {}) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(inscrito ? inscricao : null),
    subscribe: vi.fn().mockResolvedValue(inscricao),
  }
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', {
    permission: permissao,
    requestPermission: vi.fn().mockResolvedValue(respostaAoPedido),
  })
  vi.stubGlobal('navigator', {
    ...navigator,
    serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ pushManager }) },
  })
  return pushManager
}

describe('avisos no celular', () => {
  beforeEach(() => inscricao.unsubscribe.mockClear())

  describe('estadoAvisos', () => {
    it('fica indisponível sem service worker (ex.: modo de desenvolvimento)', async () => {
      await expect(estadoAvisos()).resolves.toBe('indisponivel')
    })

    it('informa quando o motorista bloqueou as notificações', async () => {
      navegadorComPush({ permissao: 'denied' })

      await expect(estadoAvisos()).resolves.toBe('bloqueado')
    })

    it('fica ativo só com permissão concedida e inscrição existente', async () => {
      navegadorComPush({ permissao: 'granted', inscrito: true })
      await expect(estadoAvisos()).resolves.toBe('ativo')

      navegadorComPush({ permissao: 'granted', inscrito: false })
      await expect(estadoAvisos()).resolves.toBe('inativo')
    })
  })

  describe('ativarAvisos', () => {
    it('inscreve o aparelho com a chave VAPID e registra no backend', async () => {
      const pushManager = navegadorComPush()
      const fetchFalso = apiFalsa({
        'GET /notificacoes/chave-publica': { corpo: { chavePublica: 'AQAB' } },
        'POST /notificacoes/inscricoes': { status: 204 },
      })

      await expect(ativarAvisos()).resolves.toBe('ativo')

      const { applicationServerKey } = pushManager.subscribe.mock.calls[0][0]
      expect(Array.from(applicationServerKey)).toEqual([1, 0, 1])
      expect(corpoEnviado(fetchFalso, 'POST /notificacoes/inscricoes')).toEqual({
        endpoint: inscricao.endpoint,
        keys: { p256dh: 'p', auth: 'a' },
      })
    })

    it('reaproveita a inscrição que o aparelho já tem', async () => {
      const pushManager = navegadorComPush({ inscrito: true })
      apiFalsa({
        'GET /notificacoes/chave-publica': { corpo: { chavePublica: 'AQAB' } },
        'POST /notificacoes/inscricoes': { status: 204 },
      })

      await ativarAvisos()

      expect(pushManager.subscribe).not.toHaveBeenCalled()
    })

    it.each([
      ['denied', 'bloqueado'],
      ['default', 'inativo'],
    ] as const)('com a resposta %s ao pedido fica %s', async (resposta, estado) => {
      navegadorComPush({ respostaAoPedido: resposta })

      await expect(ativarAvisos()).resolves.toBe(estado)
    })

    it('fica indisponível quando o servidor não tem push configurado', async () => {
      navegadorComPush()
      apiFalsa({ 'GET /notificacoes/chave-publica': { corpo: { chavePublica: null } } })

      await expect(ativarAvisos()).resolves.toBe('indisponivel')
    })

    it('fica indisponível sem service worker', async () => {
      await expect(ativarAvisos()).resolves.toBe('indisponivel')
    })
  })

  describe('desativação', () => {
    it('desativarAvisos remove a inscrição no backend e no aparelho', async () => {
      navegadorComPush({ inscrito: true })
      const fetchFalso = apiFalsa({ 'DELETE /notificacoes/inscricoes': { status: 204 } })

      await desativarAvisos()

      expect(corpoEnviado(fetchFalso, 'DELETE /notificacoes/inscricoes')).toEqual({
        endpoint: inscricao.endpoint,
      })
      expect(inscricao.unsubscribe).toHaveBeenCalled()
    })

    it('desativarAvisos não faz nada sem inscrição', async () => {
      navegadorComPush({ inscrito: false })
      const fetchFalso = apiFalsa({})

      await desativarAvisos()

      expect(fetchFalso).not.toHaveBeenCalled()
    })

    it('ao sair, cancela só no aparelho, sem chamar a API', async () => {
      navegadorComPush({ inscrito: true })
      const fetchFalso = apiFalsa({})

      await cancelarInscricaoDoAparelho()

      expect(inscricao.unsubscribe).toHaveBeenCalled()
      expect(fetchFalso).not.toHaveBeenCalled()
    })
  })

  describe('precisaInstalarNoIphone', () => {
    function aparelho(userAgent: string, instalado: boolean) {
      vi.stubGlobal('navigator', { ...navigator, userAgent })
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: instalado }))
    }

    it('orienta a instalação no iPhone fora do app instalado', () => {
      aparelho('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', false)
      expect(precisaInstalarNoIphone()).toBe(true)
    })

    it('não orienta no iPhone com o app instalado nem no Android', () => {
      aparelho('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', true)
      expect(precisaInstalarNoIphone()).toBe(false)

      aparelho('Mozilla/5.0 (Linux; Android 15)', false)
      expect(precisaInstalarNoIphone()).toBe(false)
    })
  })
})
