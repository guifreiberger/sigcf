import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Ordem } from '../../api/tipos.ts'
import { apiFalsa, corpoEnviado } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { EditarOrdem } from './EditarOrdem.tsx'

const weg = { id: 3, nome: 'WEG', telefone: null, endereco: 'Av. Prefeito Waldemar Grubba, 3300', ativo: true }
const caminhao = { id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true }
const joao = {
  id: 7,
  nome: 'João da Silva',
  email: 'joao@sigcf.local',
  perfil: 'MOTORISTA' as const,
  telefone: null,
  cnh: null,
  veiculoPadraoId: null,
  ativo: true,
}

const cadastros = {
  'GET /clientes?ativo=true': { corpo: [weg] },
  'GET /veiculos?ativo=true': { corpo: [caminhao] },
  'GET /motoristas?ativo=true': { corpo: [joao] },
}

function ordem(dados: Partial<Ordem> = {}): Ordem {
  return {
    id: 10,
    clienteId: 3,
    veiculoId: 4,
    motoristaId: 7,
    enderecoColeta: 'Portaria 2',
    dataColeta: '2099-12-01',
    pesoEstimadoKg: 300,
    pesoRealKg: null,
    distanciaMetros: null,
    duracaoSegundos: null,
    status: 'AGUARDANDO',
    observacao: null,
    createdAt: '',
    updatedAt: '',
    cliente: weg,
    veiculo: caminhao,
    motorista: joao,
    transicoesPermitidas: ['CANCELADA'],
    ...dados,
  }
}

function abrir() {
  return renderizar(<EditarOrdem />, {
    rota: '/gestor/ordens/10/editar',
    caminho: '/gestor/ordens/:id/editar',
    sessao: sessaoDe('GESTOR'),
  })
}

describe('EditarOrdem', () => {
  it('vem preenchida com os dados da ordem e salva as alterações', async () => {
    const fetchFalso = apiFalsa({
      ...cadastros,
      'GET /ordens/10': { corpo: ordem() },
      'PATCH /ordens/10': { corpo: ordem({ observacao: 'Ligar antes' }) },
    })
    abrir()

    await screen.findByRole('option', { name: 'João da Silva' })
    expect(screen.getByLabelText('Cliente')).toHaveValue('3')
    expect(screen.getByLabelText('Endereço da coleta')).toHaveValue('Portaria 2')
    expect(screen.getByLabelText('Motorista')).toHaveValue('7')
    expect(screen.getByLabelText('Veículo')).toHaveValue('4')
    expect(screen.getByLabelText('Data da coleta')).toHaveValue('2099-12-01')
    expect(screen.getByLabelText(/Peso estimado/)).toHaveValue(300)

    await userEvent.type(screen.getByLabelText(/Observações para o motorista/), 'Ligar antes')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('status', { name: 'Rota atual' })).toHaveTextContent('/gestor/ordens/10')
    expect(corpoEnviado(fetchFalso, 'PATCH /ordens/10')).toEqual({
      clienteId: 3,
      enderecoColeta: 'Portaria 2',
      dataColeta: '2099-12-01',
      pesoEstimadoKg: 300,
      observacao: 'Ligar antes',
      motoristaId: 7,
      veiculoId: 4,
    })
  })

  it('disponibiliza a coleta para os motoristas, tirando o motorista e o caminhão', async () => {
    const fetchFalso = apiFalsa({
      ...cadastros,
      'GET /ordens/10': { corpo: ordem() },
      'PATCH /ordens/10': { corpo: ordem({ status: 'DISPONIVEL', motoristaId: null, veiculoId: null }) },
    })
    abrir()

    await userEvent.click(await screen.findByRole('radio', { name: /Disponibilizar para os motoristas/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await screen.findByRole('status', { name: 'Rota atual' })
    expect(corpoEnviado(fetchFalso, 'PATCH /ordens/10')).toMatchObject({ motoristaId: null, veiculoId: null })
  })

  it('com a coleta em andamento, só deixa alterar as observações', async () => {
    apiFalsa({ ...cadastros, 'GET /ordens/10': { corpo: ordem({ status: 'EM_ANDAMENTO' }) } })
    abrir()

    expect(await screen.findByText('Com a coleta em andamento, só as observações podem ser alteradas.')).toBeInTheDocument()
    expect(screen.getByLabelText('Cliente')).toBeDisabled()
    expect(screen.getByLabelText('Data da coleta')).toBeDisabled()
    expect(screen.getByLabelText(/Observações para o motorista/)).toBeEnabled()
  })

  it('não deixa editar coleta finalizada', async () => {
    apiFalsa({ ...cadastros, 'GET /ordens/10': { corpo: ordem({ status: 'CONCLUIDA' }) } })
    abrir()

    expect(await screen.findByText('Coleta finalizada não pode ser editada.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
  })
})
