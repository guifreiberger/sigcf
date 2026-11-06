import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { apiFalsa, corpoEnviado } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { Motoristas } from './Cadastros.tsx'

const caminhao = { id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true }
const joao = {
  id: 7,
  nome: 'João da Silva',
  email: 'joao@sigcf.local',
  perfil: 'MOTORISTA',
  telefone: '47999990000',
  cnh: null,
  veiculoPadraoId: 4,
  ativo: true,
}

const abrir = () => renderizar(<Motoristas />, { sessao: sessaoDe('GESTOR') })

describe('cadastro de motoristas', () => {
  it('mostra o caminhão padrão de cada motorista', async () => {
    apiFalsa({ 'GET /motoristas?ativo=true': { corpo: [joao] }, 'GET /veiculos?ativo=true': { corpo: [caminhao] } })
    abrir()

    const linha = (await screen.findByText('João da Silva')).closest('tr')!
    expect(within(linha).getByText('ABC-1234')).toBeInTheDocument()
  })

  it('escolhe o caminhão padrão ao cadastrar o motorista', async () => {
    const fetchFalso = apiFalsa({
      'GET /motoristas?ativo=true': { corpo: [] },
      'GET /veiculos?ativo=true': { corpo: [caminhao] },
      'POST /motoristas': { status: 201, corpo: { id: 9 } },
    })
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Novo motorista' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo motorista' })
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'Pedro')
    await userEvent.type(within(dialogo).getByLabelText('E-mail'), 'pedro@sigcf.local')
    await userEvent.type(within(dialogo).getByLabelText('Senha'), 'segredo1')
    await userEvent.type(within(dialogo).getByLabelText('Telefone'), '47988887777')
    await within(dialogo).findByRole('option', { name: 'ABC-1234 — VW Delivery' })
    await userEvent.selectOptions(within(dialogo).getByLabelText(/Caminhão padrão/), 'ABC-1234 — VW Delivery')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await vi.waitFor(() => expect(corpoEnviado(fetchFalso, 'POST /motoristas')).toMatchObject({ nome: 'Pedro', veiculoPadraoId: 4 }))
  })

  it('deixa o motorista sem caminhão padrão', async () => {
    const fetchFalso = apiFalsa({
      'GET /motoristas?ativo=true': { corpo: [joao] },
      'GET /veiculos?ativo=true': { corpo: [caminhao] },
      'PATCH /motoristas/7': { corpo: joao },
    })
    abrir()

    const linha = (await screen.findByText('João da Silva')).closest('tr')!
    await userEvent.click(within(linha).getByRole('button', { name: 'Editar' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar motorista' })
    await userEvent.selectOptions(within(dialogo).getByLabelText(/Caminhão padrão/), 'Nenhum')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await vi.waitFor(() => expect(corpoEnviado(fetchFalso, 'PATCH /motoristas/7')).toMatchObject({ veiculoPadraoId: null }))
  })
})
