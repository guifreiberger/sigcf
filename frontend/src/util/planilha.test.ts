import { describe, expect, it } from 'vitest'
import type { LinhaRelatorio } from '../api/tipos.ts'
import { nomeDaPlanilha, planilhaDeColetas } from './planilha.ts'

function linha(dados: Partial<LinhaRelatorio> = {}): LinhaRelatorio {
  return {
    id: 10,
    dataColeta: '2026-11-03',
    cliente: 'WEG',
    enderecoColeta: 'Rua A, 100',
    motorista: 'João da Silva',
    placa: 'ABC1234',
    status: 'CONCLUIDA',
    pesoEstimadoKg: 1200,
    pesoRealKg: 1230.5,
    distanciaMetros: 12500,
    duracaoSegundos: 2700,
    inicio: '2026-11-03T12:00:00.000Z',
    fim: '2026-11-03T12:45:00.000Z',
    motivo: null,
    ...dados,
  }
}

const linhasDa = (csv: string) => csv.slice(1).split('\r\n')

describe('planilha de coletas', () => {
  it('começa com a marca de UTF-8, para o Excel mostrar os acentos', () => {
    expect(planilhaDeColetas([]).charCodeAt(0)).toBe(0xfeff)
  })

  it('tem o cabeçalho com as colunas pedidas pelo gestor, separadas por ponto e vírgula', () => {
    expect(linhasDa(planilhaDeColetas([]))[0]).toBe(
      'Nº;Data;Cliente;Endereço;Motorista;Caminhão;Status;Peso estimado (kg);Peso da balança (kg);Distância (km);Tempo da coleta (min);Início;Fim;Motivo',
    )
  })

  it('formata datas, números com vírgula decimal, quilômetros e minutos', () => {
    const colunas = linhasDa(planilhaDeColetas([linha()]))[1].split(';')

    expect(colunas.slice(0, 11)).toEqual([
      '10',
      '03/11/2026',
      'WEG',
      'Rua A, 100',
      'João da Silva',
      'ABC-1234',
      'Concluída',
      '1200',
      '1230,5',
      '12,5',
      '45',
    ])
    expect(colunas[11]).toMatch(/^03\/11\/2026 \d{2}:\d{2}$/)
    expect(colunas[13]).toBe('')
  })

  it('deixa vazio o que não existe, como o motorista de uma coleta que ninguém aceitou', () => {
    const colunas = linhasDa(
      planilhaDeColetas([
        linha({
          motorista: null,
          placa: null,
          status: 'CANCELADA',
          pesoRealKg: null,
          distanciaMetros: null,
          duracaoSegundos: null,
          inicio: null,
          fim: null,
          motivo: 'Ninguém aceitou',
        }),
      ]),
    )[1].split(';')

    expect(colunas).toEqual(['10', '03/11/2026', 'WEG', 'Rua A, 100', '', '', 'Cancelada', '1200', '', '', '', '', '', 'Ninguém aceitou'])
  })

  it('protege os campos com separador, aspas ou quebra de linha', () => {
    const csv = planilhaDeColetas([linha({ enderecoColeta: 'Rua A; fundos', motivo: 'Portão "fechado"\nvoltar amanhã' })])

    expect(csv).toContain(';"Rua A; fundos";')
    expect(csv).toContain(';"Portão ""fechado""\nvoltar amanhã"')
  })

  it('impede que um texto digitado vire fórmula ao abrir no Excel', () => {
    const colunas = linhasDa(planilhaDeColetas([linha({ cliente: '=HYPERLINK("http://x")', motivo: '+1' })]))[1]

    expect(colunas).toContain(`;"'=HYPERLINK(""http://x"")";`)
    expect(colunas.endsWith(";'+1")).toBe(true)
  })

  it('nomeia o arquivo com o período', () => {
    expect(nomeDaPlanilha('2026-11-01', '2026-11-30')).toBe('coletas_2026-11-01_a_2026-11-30.csv')
  })
})
