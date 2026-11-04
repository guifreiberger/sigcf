import { describe, expect, it, vi } from 'vitest'
import { localizacaoBloqueada, obterLocalizacao } from './localizacao.ts'

function gpsQue(responde: (sucesso: PositionCallback, erro: PositionErrorCallback) => void) {
  const getCurrentPosition = vi.fn(
    (sucesso: PositionCallback, erro: PositionErrorCallback, _opcoes?: PositionOptions) =>
      responde(sucesso, erro),
  )
  vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
  return getCurrentPosition
}

describe('localização', () => {
  describe('obterLocalizacao', () => {
    it('arredonda as coordenadas e a precisão', async () => {
      const getCurrentPosition = gpsQue((sucesso) =>
        sucesso({
          coords: { latitude: -26.482345678, longitude: -49.071234567, accuracy: 12.6 },
        } as GeolocationPosition),
      )

      await expect(obterLocalizacao()).resolves.toEqual({
        latitude: -26.482346,
        longitude: -49.071235,
        precisaoMetros: 13,
      })
      expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({
        enableHighAccuracy: true,
        timeout: 8_000,
      })
    })

    it('segue sem localização quando o motorista nega a permissão', async () => {
      gpsQue((_, erro) => erro({ code: 1 } as GeolocationPositionError))

      await expect(obterLocalizacao()).resolves.toBeNull()
    })

    it('segue sem localização quando o navegador não tem GPS', async () => {
      vi.stubGlobal('navigator', {})

      await expect(obterLocalizacao()).resolves.toBeNull()
    })
  })

  describe('localizacaoBloqueada', () => {
    it.each([
      ['denied', true],
      ['prompt', false],
      ['granted', false],
    ])('com a permissão %s devolve %s', async (state, esperado) => {
      vi.stubGlobal('navigator', {
        permissions: { query: vi.fn().mockResolvedValue({ state }) },
      })

      await expect(localizacaoBloqueada()).resolves.toBe(esperado)
    })

    it('considera liberada quando o navegador não informa a permissão', async () => {
      vi.stubGlobal('navigator', {
        permissions: { query: vi.fn().mockRejectedValue(new TypeError('sem suporte')) },
      })

      await expect(localizacaoBloqueada()).resolves.toBe(false)
    })
  })
})
