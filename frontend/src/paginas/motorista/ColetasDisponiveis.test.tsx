import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Ordem } from '../../api/tipos.ts'
import { apiFalsa, corpoEnviado } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { hojeLocal } from '../../util/formatos.ts'
import { ColetasDisponiveis } from './ColetasDisponiveis.tsx'

const DISPONIVEIS = 'GET /ordens/disponiveis'
const FROTA = {
  'GET /veiculos?ativo=true': {
    corpo: [{ id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true }],
  },
}

function amanha() {
  const data = new Date()
  data.setDate(data.getDate() + 1)
  return data.toLocaleDateString('en-CA')
}

function disponivel(dados: Partial<Ordem> & Pick<Ordem, 'id'>): Ordem {
  return {
    clienteId: 3,
    veiculoId: null,
    motoristaId: null,
    enderecoColeta: 'Rua Walter Marquardt, 1000',
    dataColeta: hojeLocal(),
    pesoEstimadoKg: 800,
    status: 'DISPONIVEL',
    observacao: null,
    createdAt: '',
    updatedAt: '',
    cliente: { id: 3, nome: 'WEG', telefone: null, endereco: '', ativo: true },
    transicoesPermitidas: [],
    ...dados,
  }
}

const abrir = () => renderizar(<ColetasDisponiveis />, { sessao: sessaoDe('MOTORISTA') })

async function aceitarCom(veiculo: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Aceitar coleta' }))
  const dialogo = screen.getByRole('dialog', { name: 'Aceitar coleta' })
  await within(dialogo).findByRole('option', { name: veiculo })
  await userEvent.selectOptions(within(dialogo).getByLabelText('Veículo'), veiculo)
  await userEvent.click(within(dialogo).getByRole('button', { name: 'Aceitar coleta' }))
  return dialogo
}

describe('ColetasDisponiveis', () => {
  it('mostra o dia, o peso e a regra de quem fica com a coleta', async () => {
    apiFalsa({
      [DISPONIVEIS]: {
        corpo: [
          disponivel({ id: 9 }),
          disponivel({
            id: 10,
            dataColeta: amanha(),
            pesoEstimadoKg: null,
            cliente: { id: 5, nome: 'Malwee', telefone: null, endereco: '', ativo: true },
          }),
        ],
      },
    })
    abrir()

    const weg = (await screen.findByRole('heading', { name: 'WEG' })).closest('article')!
    expect(within(weg).getByText('Hoje')).toBeInTheDocument()
    expect(within(weg).getByText('cerca de 800 kg')).toBeInTheDocument()
    const malwee = screen.getByRole('heading', { name: 'Malwee' }).closest('article')!
    expect(within(malwee).getByText('Amanhã')).toBeInTheDocument()
    expect(within(malwee).queryByText(/cerca de/)).not.toBeInTheDocument()
    expect(screen.getByText('O primeiro motorista que aceitar fica com a coleta.')).toBeInTheDocument()
  })

  it('aceita a coleta com o veículo escolhido e confirma para quando ficou', async () => {
    const aceita = disponivel({ id: 9, dataColeta: amanha(), status: 'AGUARDANDO', motoristaId: 7, veiculoId: 4 })
    const fetchFalso = apiFalsa({
      [DISPONIVEIS]: { corpo: [disponivel({ id: 9, dataColeta: amanha() })] },
      ...FROTA,
      'POST /ordens/9/aceitar': { corpo: aceita },
    })
    abrir()

    await aceitarCom('ABC-1234 — VW Delivery (5.000 kg)')

    expect(await screen.findByRole('status')).toHaveTextContent(/Coleta em WEG aceita para \d{2}\/\d{2}\/\d{4}/)
    expect(corpoEnviado(fetchFalso, 'POST /ordens/9/aceitar')).toEqual({ veiculoId: 4 })
  })

  it('avisa quando outro motorista aceitou primeiro, sem deixar tentar de novo', async () => {
    apiFalsa({
      [DISPONIVEIS]: { corpo: [disponivel({ id: 9 })] },
      ...FROTA,
      'POST /ordens/9/aceitar': { status: 409, corpo: { message: 'Esta coleta já foi aceita por outro motorista.' } },
    })
    abrir()

    const dialogo = await aceitarCom('ABC-1234 — VW Delivery (5.000 kg)')

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Esta coleta já foi aceita por outro motorista.')
    expect(within(dialogo).queryByRole('button', { name: 'Aceitar coleta' })).not.toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Veículo')).toBeDisabled()
    expect(within(dialogo).getByRole('button', { name: 'Entendi' })).toBeInTheDocument()
  })

  it('não ocupa espaço na tela quando não há coleta disponível', async () => {
    const fetchFalso = apiFalsa({ [DISPONIVEIS]: { corpo: [] } })
    abrir()

    await vi.waitFor(() => expect(fetchFalso).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Coletas disponíveis' })).not.toBeInTheDocument()
  })
})
