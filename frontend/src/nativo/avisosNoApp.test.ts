import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { salvarSessao } from '../api/cliente.ts'
import { apiFalsa, corpoEnviado } from '../testes/apiFalsa.ts'
import { sessaoDe } from '../testes/renderizar.tsx'
import { ativarAvisosNoApp, desligarAvisosNoApp } from './avisosNoApp.ts'

const { push, ouvintes } = vi.hoisted(() => {
  const ouvintes: Record<string, (dados: { value?: string }) => void> = {}
  return {
    ouvintes,
    push: {
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
      createChannel: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
      removeAllListeners: vi.fn(),
      addListener: vi.fn(async (evento: string, ouvinte: (dados: { value?: string }) => void) => {
        ouvintes[evento] = ouvinte
        return { remove: vi.fn() }
      }),
    },
  }
})
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: push }))

describe('avisos de coleta no app Android', () => {
  beforeEach(() => {
    salvarSessao(sessaoDe('MOTORISTA'))
    push.checkPermissions.mockResolvedValue({ receive: 'prompt' })
    push.requestPermissions.mockResolvedValue({ receive: 'granted' })
  })

  afterEach(() => {
    vi.clearAllMocks()
    for (const evento of Object.keys(ouvintes)) delete ouvintes[evento]
  })

  it('pede a permissão, cria o canal das coletas e registra o aparelho no servidor', async () => {
    const fetchFalso = apiFalsa({ 'POST /notificacoes/aparelhos': { status: 204 } })

    await expect(ativarAvisosNoApp(vi.fn())).resolves.toBe('ativo')

    expect(push.requestPermissions).toHaveBeenCalled()
    // O servidor manda os avisos neste canal, com prioridade alta para tocar e aparecer na tela.
    expect(push.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: 'coletas', importance: 5 }))
    expect(push.register).toHaveBeenCalled()

    ouvintes.registration({ value: 'token-do-firebase' })
    await vi.waitFor(() =>
      expect(corpoEnviado(fetchFalso, 'POST /notificacoes/aparelhos')).toEqual({ token: 'token-do-firebase' }),
    )
  })

  it('não pede de novo a permissão já concedida', async () => {
    push.checkPermissions.mockResolvedValue({ receive: 'granted' })

    await ativarAvisosNoApp(vi.fn())

    expect(push.requestPermissions).not.toHaveBeenCalled()
    expect(push.register).toHaveBeenCalled()
  })

  it('não registra o aparelho quando o motorista nega a permissão', async () => {
    push.requestPermissions.mockResolvedValue({ receive: 'denied' })

    await expect(ativarAvisosNoApp(vi.fn())).resolves.toBe('negado')

    expect(push.register).not.toHaveBeenCalled()
  })

  it('não quebra o app quando o servidor recusa o registro', async () => {
    apiFalsa({ 'POST /notificacoes/aparelhos': { status: 500, corpo: { message: 'Erro' } } })
    await ativarAvisosNoApp(vi.fn())

    expect(() => ouvintes.registration({ value: 'token-do-firebase' })).not.toThrow()
  })

  it('atualiza as coletas quando chega um aviso ou o motorista toca nele', async () => {
    const aoChegarAviso = vi.fn()
    await ativarAvisosNoApp(aoChegarAviso)

    ouvintes.pushNotificationReceived({})
    ouvintes.pushNotificationActionPerformed({})

    expect(aoChegarAviso).toHaveBeenCalledTimes(2)
  })

  it('ao sair da conta, descadastra o aparelho no Firebase para ele não receber avisos de quem saiu', async () => {
    await desligarAvisosNoApp()

    expect(push.removeAllListeners).toHaveBeenCalled()
    expect(push.unregister).toHaveBeenCalled()
  })
})
