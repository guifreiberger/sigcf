import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFalsa } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { Relatorios } from './Relatorios.tsx'

const cadastros = {
  'GET /clientes': { corpo: [{ id: 3, nome: 'WEG', telefone: null, endereco: '', ativo: true }] },
  'GET /motoristas': {
    corpo: [{ id: 7, nome: 'João da Silva', email: '', perfil: 'MOTORISTA', telefone: null, cnh: null, veiculoPadraoId: null, ativo: true }],
  },
}
const consulta = 'GET /relatorios/coletas?de=2026-11-01&ate=2026-11-30&motoristaId=7&status=CONCLUIDA'
const linha = {
  id: 10,
  dataColeta: '2026-11-03',
  cliente: 'WEG',
  enderecoColeta: 'Rua A, 100',
  motorista: 'João da Silva',
  placa: 'ABC1234',
  status: 'CONCLUIDA',
  pesoEstimadoKg: null,
  pesoRealKg: 900,
  distanciaMetros: 5000,
  duracaoSegundos: 1800,
  inicio: null,
  fim: null,
  motivo: null,
}

async function preencherFiltros() {
  await screen.findByRole('option', { name: 'João da Silva' })
  await userEvent.clear(screen.getByLabelText('De'))
  await userEvent.type(screen.getByLabelText('De'), '2026-11-01')
  await userEvent.clear(screen.getByLabelText('Até'))
  await userEvent.type(screen.getByLabelText('Até'), '2026-11-30')
  await userEvent.selectOptions(screen.getByLabelText('Motorista'), 'João da Silva')
  await userEvent.selectOptions(screen.getByLabelText('Status'), 'Concluída')
}

describe('Relatorios', () => {
  let arquivoBaixado: string | null
  const criarUrl = vi.fn(() => 'blob:planilha')

  beforeEach(() => {
    arquivoBaixado = null
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      arquivoBaixado = this.download
    })
  })

  afterEach(() => criarUrl.mockClear())

  it('baixa a planilha das coletas do período com os filtros escolhidos', async () => {
    apiFalsa({ ...cadastros, [consulta]: { corpo: [linha] } })
    renderizar(<Relatorios />, { sessao: sessaoDe('GESTOR') })

    await preencherFiltros()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha' }))

    expect(await screen.findByText('Planilha baixada com 1 coleta.')).toBeInTheDocument()
    expect(criarUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(arquivoBaixado).toBe('coletas_2026-11-01_a_2026-11-30.csv')
  })

  it('avisa quando não há coletas com esses filtros, sem baixar nada', async () => {
    apiFalsa({ ...cadastros, [consulta]: { corpo: [] } })
    renderizar(<Relatorios />, { sessao: sessaoDe('GESTOR') })

    await preencherFiltros()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha' }))

    expect(await screen.findByText('Nenhuma coleta encontrada com esses filtros.')).toBeInTheDocument()
    expect(criarUrl).not.toHaveBeenCalled()
  })

  it('mostra o erro do servidor, como um período longo demais', async () => {
    apiFalsa({ ...cadastros, [consulta]: { status: 400, corpo: { message: 'Escolha um período de até um ano.' } } })
    renderizar(<Relatorios />, { sessao: sessaoDe('GESTOR') })

    await preencherFiltros()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha um período de até um ano.')
  })
})
