import { describe, expect, it } from 'vitest'
import { periodoPredefinido } from './periodos.ts'

describe('períodos predefinidos', () => {
  it('últimos 30 dias, contando hoje', () => {
    expect(periodoPredefinido('30dias', '2026-11-05')).toEqual({ de: '2026-10-07', ate: '2026-11-05' })
  })

  it('este mês, do dia 1 até hoje', () => {
    expect(periodoPredefinido('mes', '2026-11-05')).toEqual({ de: '2026-11-01', ate: '2026-11-05' })
  })

  it('mês passado inteiro, inclusive na virada do ano', () => {
    expect(periodoPredefinido('mesPassado', '2026-11-05')).toEqual({ de: '2026-10-01', ate: '2026-10-31' })
    expect(periodoPredefinido('mesPassado', '2026-01-15')).toEqual({ de: '2025-12-01', ate: '2025-12-31' })
  })

  it('últimos 12 meses, do primeiro dia do mês até hoje', () => {
    expect(periodoPredefinido('12meses', '2026-11-05')).toEqual({ de: '2025-12-01', ate: '2026-11-05' })
  })
})
