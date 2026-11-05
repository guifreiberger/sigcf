import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { abrirConfiguracoesDoApp, acompanharEmSegundoPlano } from './gpsEmSegundoPlano.ts'

const { plugin, notificacoes } = vi.hoisted(() => ({
  plugin: {
    addWatcher: vi.fn(),
    removeWatcher: vi.fn(),
    openSettings: vi.fn(),
  },
  notificacoes: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  },
}))

vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  registerPlugin: () => plugin,
}))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: notificacoes }))

type Retorno = Parameters<typeof plugin.addWatcher>
type AoReceber = (local?: object, erro?: { code?: string }) => void

// Espera o plugin ser ligado e devolve o callback que ele recebeu.
async function callbackDoPlugin() {
  await vi.waitFor(() => expect(plugin.addWatcher).toHaveBeenCalled())
  return (plugin.addWatcher.mock.calls[0] as Retorno)[1] as AoReceber
}

describe('GPS em segundo plano (app Android)', () => {
  beforeEach(() => {
    plugin.addWatcher.mockResolvedValue('vigia-1')
    plugin.removeWatcher.mockResolvedValue(undefined)
    notificacoes.checkPermissions.mockResolvedValue({ display: 'prompt' })
    notificacoes.requestPermissions.mockResolvedValue({ display: 'granted' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('pede para mostrar notificações e liga o GPS com o aviso fixo que o Android exige', async () => {
    acompanharEmSegundoPlano(vi.fn(), vi.fn())

    await callbackDoPlugin()
    expect(notificacoes.requestPermissions).toHaveBeenCalled()
    // Sem "backgroundMessage", o plugin só entrega posições com o app na tela.
    expect(plugin.addWatcher.mock.calls[0][0]).toMatchObject({
      backgroundTitle: expect.stringContaining('SIGCF'),
      backgroundMessage: expect.stringContaining('concluir'),
      requestPermissions: true,
      stale: false,
    })
  })

  it('não pede de novo a permissão de notificação já concedida', async () => {
    notificacoes.checkPermissions.mockResolvedValue({ display: 'granted' })

    acompanharEmSegundoPlano(vi.fn(), vi.fn())

    await callbackDoPlugin()
    expect(notificacoes.requestPermissions).not.toHaveBeenCalled()
  })

  it('liga o GPS mesmo se o pedido de notificação falhar', async () => {
    notificacoes.checkPermissions.mockRejectedValue(new Error('indisponível'))

    acompanharEmSegundoPlano(vi.fn(), vi.fn())

    await callbackDoPlugin()
  })

  it('entrega cada posição no formato do trajeto', async () => {
    const aoLer = vi.fn()
    acompanharEmSegundoPlano(aoLer, vi.fn())

    const receber = await callbackDoPlugin()
    receber({ latitude: -26.4851, longitude: -49.0713, accuracy: 6.4, time: 1_793_900_000_000 })

    expect(aoLer).toHaveBeenCalledWith({
      latitude: -26.4851,
      longitude: -49.0713,
      precisaoMetros: 6.4,
      registradoEm: 1_793_900_000_000,
    })
  })

  it('avisa quando o motorista não deu permissão de localização', async () => {
    const aoFalhar = vi.fn()
    acompanharEmSegundoPlano(vi.fn(), aoFalhar)

    const receber = await callbackDoPlugin()
    receber(undefined, { code: 'NOT_AUTHORIZED' })
    receber(undefined, { code: 'OUTRO' })

    expect(aoFalhar.mock.calls).toEqual([['sem-permissao'], ['outro']])
  })

  it('desliga o GPS ao parar e ignora o que chegar depois', async () => {
    const aoLer = vi.fn()
    const parar = acompanharEmSegundoPlano(aoLer, vi.fn())
    const receber = await callbackDoPlugin()

    parar()
    receber({ latitude: 1, longitude: 1, accuracy: 5, time: 1 })

    await vi.waitFor(() => expect(plugin.removeWatcher).toHaveBeenCalledWith({ id: 'vigia-1' }))
    expect(aoLer).not.toHaveBeenCalled()
  })

  it('não deixa o GPS ligado se a coleta terminar antes de ele ligar', async () => {
    const parar = acompanharEmSegundoPlano(vi.fn(), vi.fn())
    parar()

    await vi.waitFor(() => expect(notificacoes.checkPermissions).toHaveBeenCalled())
    await new Promise((resolver) => setTimeout(resolver, 0))
    expect(plugin.addWatcher).not.toHaveBeenCalled()
  })

  it('abre as configurações do app para liberar a localização', async () => {
    await abrirConfiguracoesDoApp()

    expect(plugin.openSettings).toHaveBeenCalled()
  })
})
