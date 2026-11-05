import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatarData,
  formatarDataExtenso,
  formatarDataHora,
  formatarDistancia,
  formatarDuracao,
  formatarHora,
  formatarKg,
  formatarPlaca,
  formatarTelefone,
  hojeLocal,
  iniciais,
  linkCoordenadas,
  linkMapa,
  tempoDesde,
} from './formatos.ts'

describe('formatos', () => {
  afterEach(() => vi.useRealTimers())

  describe('iniciais', () => {
    it.each([
      ['João da Silva', 'JS'],
      ['  ana  ', 'A'],
      ['maria clara souza', 'MS'],
      ['', ''],
    ])('%j vira %j', (nome, esperado) => {
      expect(iniciais(nome)).toBe(esperado)
    })
  })

  it('hojeLocal usa a data do aparelho no formato da API', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 23, 30))

    expect(hojeLocal()).toBe('2026-11-04')
  })

  it('formatarData converte AAAA-MM-DD para o padrão brasileiro', () => {
    expect(formatarData('2026-11-04')).toBe('04/11/2026')
  })

  it('formatarDataExtenso inclui o dia da semana', () => {
    expect(formatarDataExtenso('2026-11-04')).toBe('quarta-feira, 4 de novembro')
  })

  it('formatarDataHora e formatarHora usam o horário local', () => {
    expect(formatarDataHora('2026-11-04T09:30:00')).toMatch(/04\/11\/2026.*09:30/)
    expect(formatarHora(new Date(2026, 10, 4, 9, 30, 15).getTime())).toBe('09:30:15')
  })

  describe('formatarTelefone', () => {
    it.each([
      ['47988880000', '(47) 98888-0000'],
      ['4733701234', '(47) 3370-1234'],
      ['0800123', '0800123'],
      [null, '—'],
    ])('%j vira %j', (telefone, esperado) => {
      expect(formatarTelefone(telefone)).toBe(esperado)
    })
  })

  it('formatarPlaca só coloca hífen no padrão antigo', () => {
    expect(formatarPlaca('ABC1234')).toBe('ABC-1234')
    expect(formatarPlaca('ABC1D23')).toBe('ABC1D23')
  })

  it('formatarKg usa separadores brasileiros', () => {
    expect(formatarKg(1250.5)).toBe('1.250,5 kg')
  })

  describe('trajeto', () => {
    it.each([
      [20, 'menos de 1 min'],
      [42 * 60, '42 min'],
      [65 * 60, '1 h 05 min'],
      [3 * 3600 + 20 * 60 + 40, '3 h 21 min'],
    ])('formatarDuracao(%i) é %j', (segundos, esperado) => {
      expect(formatarDuracao(segundos)).toBe(esperado)
    })

    it.each([
      [0, '0 m'],
      [850.4, '850 m'],
      [3420, '3,4 km'],
      [12_000, '12 km'],
    ])('formatarDistancia(%d) é %j', (metros, esperado) => {
      expect(formatarDistancia(metros)).toBe(esperado)
    })

    it('tempoDesde diz há quanto tempo veio a última posição', () => {
      const agora = Date.parse('2026-11-04T15:30:00Z')

      expect(tempoDesde('2026-11-04T15:29:40Z', agora)).toBe('agora há pouco')
      expect(tempoDesde('2026-11-04T15:22:00Z', agora)).toBe('há 8 min')
      expect(tempoDesde('2026-11-04T14:00:00Z', agora)).toBe('há 1 h 30 min')
    })
  })

  it('os links do mapa codificam o endereço e as coordenadas', () => {
    expect(linkMapa('Rua A, 100')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%20100',
    )
    expect(linkCoordenadas(-26.48, -49.07)).toBe(
      'https://www.google.com/maps/search/?api=1&query=-26.48,-49.07',
    )
  })
})
