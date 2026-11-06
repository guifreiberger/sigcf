import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Dashboard as DadosDashboard } from '../../api/tipos.ts'
import { apiFalsa } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { hojeLocal } from '../../util/formatos.ts'
import { periodoPredefinido } from '../../util/periodos.ts'
import { Dashboard } from './Dashboard.tsx'

const trintaDias = periodoPredefinido('30dias', hojeLocal())
const dozeMeses = periodoPredefinido('12meses', hojeLocal())
const rota = ({ de, ate }: { de: string; ate: string }) => `GET /relatorios/dashboard?de=${de}&ate=${ate}`

const dados: DadosDashboard = {
  de: trintaDias.de,
  ate: trintaDias.ate,
  agrupamento: 'dia',
  totais: {
    coletas: 7,
    concluidas: 3,
    falhas: 1,
    canceladas: 1,
    pesoKg: 1500.5,
    semPesagem: 1,
    distanciaMetros: 25000,
    duracaoMediaSegundos: 1200,
  },
  pesoPorPeriodo: [
    { periodo: '2026-11-03', pesoKg: 1000, coletas: 2 },
    { periodo: '2026-11-04', pesoKg: 500.5, coletas: 1 },
  ],
  clientes: [
    { clienteId: 3, cliente: 'WEG', coletas: 4, pesoKg: 1500.5 },
    { clienteId: 5, cliente: 'Malwee', coletas: 2, pesoKg: 0 },
  ],
  motoristas: [
    { motoristaId: 7, motorista: 'João', coletas: 2, falhas: 0, distanciaMetros: 20000, pesoKg: 1500.5, duracaoMediaSegundos: 1500 },
    { motoristaId: 8, motorista: 'Maria', coletas: 1, falhas: 1, distanciaMetros: 5000, pesoKg: 0, duracaoMediaSegundos: null },
  ],
}
const inteligencia = { 'GET /inteligencia/clientes': { corpo: { hoje: hojeLocal(), janelaDias: 365, alertas: [], clientes: [] } } }

const abrir = () => renderizar(<Dashboard />, { sessao: sessaoDe('GESTOR') })

describe('Dashboard', () => {
  it('mostra os indicadores do período, com o peso da balança', async () => {
    apiFalsa({ ...inteligencia, [rota(trintaDias)]: { corpo: dados } })
    abrir()

    const indicadores = await screen.findByRole('region', { name: 'Indicadores do período' })
    expect(within(indicadores).getByText('1.500,5 kg')).toBeInTheDocument()
    expect(within(indicadores).getByText('25 km')).toBeInTheDocument()
    expect(within(indicadores).getByText('20 min')).toBeInTheDocument()
    expect(within(indicadores).getByText('1 concluída sem pesagem')).toBeInTheDocument()
  })

  it('mostra o peso de cada dia no gráfico e numa tabela', async () => {
    apiFalsa({ ...inteligencia, [rota(trintaDias)]: { corpo: dados } })
    abrir()

    expect(await screen.findByRole('listitem', { name: '03/11: 1.000 kg em 2 coletas' })).toBeInTheDocument()
    await userEvent.click(screen.getByText('Ver em tabela'))
    expect(screen.getByRole('cell', { name: '500,5 kg' })).toBeInTheDocument()
  })

  it('ordena os clientes que mais pedem coletas', async () => {
    apiFalsa({ ...inteligencia, [rota(trintaDias)]: { corpo: dados } })
    abrir()

    const ranking = await screen.findByRole('list', { name: 'Clientes que mais pedem coletas' })
    const nomes = within(ranking)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('strong')?.textContent)
    expect(nomes).toEqual(['WEG', 'Malwee'])
    expect(within(ranking).getByText('4 coletas')).toBeInTheDocument()
  })

  it('resume o trabalho de cada motorista', async () => {
    apiFalsa({ ...inteligencia, [rota(trintaDias)]: { corpo: dados } })
    abrir()

    const joao = (await screen.findByRole('rowheader', { name: 'João' })).closest('tr')!
    expect(within(joao).getByText('20 km')).toBeInTheDocument()
    expect(within(joao).getByText('25 min')).toBeInTheDocument()
    expect(within(joao).getByText('1.500,5 kg')).toBeInTheDocument()
  })

  it('troca o período', async () => {
    const fetchFalso = apiFalsa({
      ...inteligencia,
      [rota(trintaDias)]: { corpo: dados },
      [rota(dozeMeses)]: { corpo: { ...dados, agrupamento: 'mes', pesoPorPeriodo: [] } },
    })
    abrir()

    await screen.findByRole('region', { name: 'Indicadores do período' })
    await userEvent.selectOptions(screen.getByLabelText('Período'), 'Últimos 12 meses')

    await vi.waitFor(() =>
      expect(fetchFalso.mock.calls.map(([url]) => url)).toContain(
        `/api/relatorios/dashboard?de=${dozeMeses.de}&ate=${dozeMeses.ate}`,
      ),
    )
  })

  it('mantém os alertas e os padrões de pedidos da inteligência', async () => {
    apiFalsa({ ...inteligencia, [rota(trintaDias)]: { corpo: dados } })
    abrir()

    expect(await screen.findByRole('heading', { name: 'Coletas esperadas' })).toBeInTheDocument()
  })
})
