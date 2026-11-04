import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { apiFalsa, corpoEnviado } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { NovaOrdem } from './NovaOrdem.tsx'

const cadastros = {
  'GET /clientes?ativo=true': {
    corpo: [
      { id: 3, nome: 'WEG', telefone: null, endereco: 'Av. Prefeito Waldemar Grubba, 3300', ativo: true },
      { id: 5, nome: 'Malwee', telefone: null, endereco: 'Rua Bertha Weege, 2000', ativo: true },
    ],
  },
  'GET /veiculos?ativo=true': {
    corpo: [{ id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true }],
  },
  'GET /motoristas?ativo=true': {
    corpo: [{ id: 7, nome: 'João da Silva', email: 'joao@sigcf.local', perfil: 'MOTORISTA', ativo: true }],
  },
}

function abrir(rota = '/gestor/ordens/nova') {
  return renderizar(<NovaOrdem />, { rota, caminho: '/gestor/ordens/nova', sessao: sessaoDe('GESTOR') })
}

async function preencherObrigatorios() {
  await screen.findByRole('option', { name: 'WEG' })
  await userEvent.selectOptions(screen.getByLabelText('Cliente'), 'WEG')
  await userEvent.selectOptions(screen.getByLabelText('Motorista'), 'João da Silva')
  await userEvent.selectOptions(screen.getByLabelText('Veículo'), 'ABC-1234 — VW Delivery (5.000 kg)')
  await userEvent.clear(screen.getByLabelText('Data da coleta'))
  await userEvent.type(screen.getByLabelText('Data da coleta'), '2099-12-01')
}

describe('NovaOrdem', () => {
  it('sugere o endereço do cliente escolhido', async () => {
    apiFalsa(cadastros)
    abrir()

    await screen.findByRole('option', { name: 'Malwee' })
    await userEvent.selectOptions(screen.getByLabelText('Cliente'), 'Malwee')

    expect(screen.getByLabelText('Endereço da coleta')).toHaveValue('Rua Bertha Weege, 2000')
  })

  it('cria a ordem e abre o detalhe dela', async () => {
    const fetchFalso = apiFalsa({ ...cadastros, 'POST /ordens': { status: 201, corpo: { id: 42 } } })
    abrir()

    await preencherObrigatorios()
    await userEvent.type(screen.getByLabelText(/Peso estimado/), '350.5')
    await userEvent.type(screen.getByLabelText(/Observações para o motorista/), '  Ligar na chegada ')
    await userEvent.click(screen.getByRole('button', { name: 'Criar ordem' }))

    expect(await screen.findByRole('status', { name: 'Rota atual' })).toHaveTextContent('/gestor/ordens/42')
    expect(corpoEnviado(fetchFalso, 'POST /ordens')).toEqual({
      clienteId: 3,
      veiculoId: 4,
      motoristaId: 7,
      dataColeta: '2099-12-01',
      enderecoColeta: 'Av. Prefeito Waldemar Grubba, 3300',
      pesoEstimadoKg: 350.5,
      observacao: 'Ligar na chegada',
    })
  })

  it('permite trocar o endereço sugerido', async () => {
    const fetchFalso = apiFalsa({ ...cadastros, 'POST /ordens': { status: 201, corpo: { id: 42 } } })
    abrir()

    await preencherObrigatorios()
    await userEvent.clear(screen.getByLabelText('Endereço da coleta'))
    await userEvent.type(screen.getByLabelText('Endereço da coleta'), 'Portaria 2')
    await userEvent.click(screen.getByRole('button', { name: 'Criar ordem' }))

    await screen.findByRole('status', { name: 'Rota atual' })
    expect(corpoEnviado(fetchFalso, 'POST /ordens')).toMatchObject({ enderecoColeta: 'Portaria 2' })
  })

  it('vem preenchida a partir de um alerta da inteligência', async () => {
    apiFalsa(cadastros)
    abrir('/gestor/ordens/nova?clienteId=3&data=2099-11-20')

    await screen.findByRole('option', { name: 'WEG' })
    expect(screen.getByLabelText('Cliente')).toHaveValue('3')
    expect(screen.getByLabelText('Data da coleta')).toHaveValue('2099-11-20')
    expect(screen.getByLabelText('Endereço da coleta')).toHaveValue('Av. Prefeito Waldemar Grubba, 3300')
  })

  it('mostra o erro do backend sem sair da tela', async () => {
    apiFalsa({
      ...cadastros,
      'POST /ordens': { status: 422, corpo: { message: 'Motorista não encontrado ou inativo.' } },
    })
    abrir()

    await preencherObrigatorios()
    await userEvent.click(screen.getByRole('button', { name: 'Criar ordem' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Motorista não encontrado ou inativo.')
    expect(screen.getByRole('heading', { name: 'Nova ordem de coleta' })).toBeInTheDocument()
  })

  it('avisa quando faltam cadastros ativos', async () => {
    apiFalsa({ ...cadastros, 'GET /veiculos?ativo=true': { corpo: [] } })
    abrir()

    expect(
      await screen.findByText(/Cadastre ao menos um cliente, um veículo e um motorista ativos/),
    ).toBeInTheDocument()
  })
})
