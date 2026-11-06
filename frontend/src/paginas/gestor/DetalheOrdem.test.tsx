import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Historico, Ordem } from '../../api/tipos.ts'
import { apiFalsa, corpoEnviado } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { DetalheOrdem } from './DetalheOrdem.tsx'

const gestor = { id: 1, nome: 'Ana Souza', perfil: 'GESTOR' as const }
const passo = (id: number, statusAnterior: Historico['statusAnterior'], statusNovo: Historico['statusNovo'], motivo: string | null = null): Historico => ({
  id,
  statusAnterior,
  statusNovo,
  motivo,
  latitude: null,
  longitude: null,
  precisaoMetros: null,
  createdAt: '2026-11-05T12:00:00Z',
  usuario: gestor,
})

function ordem(dados: Partial<Ordem> = {}): Ordem {
  return {
    id: 10,
    clienteId: 3,
    veiculoId: 4,
    motoristaId: 7,
    enderecoColeta: 'Rua A, 100',
    dataColeta: '2026-11-05',
    pesoEstimadoKg: null,
    pesoRealKg: null,
    distanciaMetros: null,
    duracaoSegundos: null,
    status: 'AGUARDANDO',
    observacao: null,
    createdAt: '2026-11-05T11:00:00Z',
    updatedAt: '',
    cliente: { id: 3, nome: 'WEG', telefone: null, endereco: '', ativo: true },
    veiculo: { id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true },
    criadoPor: gestor,
    historico: [passo(1, null, 'AGUARDANDO')],
    transicoesPermitidas: ['CANCELADA'],
    ...dados,
  }
}

const abrir = () =>
  renderizar(<DetalheOrdem />, { rota: '/gestor/ordens/10', caminho: '/gestor/ordens/:id', sessao: sessaoDe('GESTOR') })

describe('DetalheOrdem', () => {
  it('oferece editar a ordem que ainda não terminou', async () => {
    apiFalsa({ 'GET /ordens/10': { corpo: ordem() } })
    abrir()

    expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/gestor/ordens/10/editar')
  })

  it('não oferece editar a ordem finalizada', async () => {
    apiFalsa({ 'GET /ordens/10': { corpo: ordem({ status: 'CANCELADA', transicoesPermitidas: [] }) } })
    abrir()

    await screen.findByText('Rua A, 100')
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('registra o peso da balança na coleta concluída', async () => {
    const concluida = ordem({ status: 'CONCLUIDA', transicoesPermitidas: [] })
    const fetchFalso = apiFalsa({
      'GET /ordens/10': { corpo: concluida },
      'PATCH /ordens/10/peso': { corpo: { ...concluida, pesoRealKg: 1230.5 } },
    })
    abrir()

    expect(await screen.findByText('Aguardando pesagem')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Peso da balança (kg)'), '1230.5')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar peso' }))

    expect(await screen.findByText('1.230,5 kg')).toBeInTheDocument()
    expect(corpoEnviado(fetchFalso, 'PATCH /ordens/10/peso')).toEqual({ pesoRealKg: 1230.5 })
  })

  it('mostra o peso já registrado, com a opção de corrigir', async () => {
    apiFalsa({
      'GET /ordens/10': { corpo: ordem({ status: 'CONCLUIDA', transicoesPermitidas: [], pesoRealKg: 900 }) },
    })
    abrir()

    expect(await screen.findByText('900 kg')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Corrigir' }))
    expect(screen.getByLabelText('Peso da balança (kg)')).toHaveValue(900)
  })

  it('identifica as edições no histórico', async () => {
    apiFalsa({
      'GET /ordens/10': {
        corpo: ordem({
          historico: [passo(1, null, 'AGUARDANDO'), passo(2, 'AGUARDANDO', 'AGUARDANDO', 'Ordem editada: data e observações')],
        }),
      },
    })
    abrir()

    const historico = (await screen.findByRole('heading', { name: 'Histórico de status' })).closest('section')!
    expect(within(historico).getByText('Ordem editada')).toBeInTheDocument()
    expect(within(historico).getByText('Ordem editada: data e observações')).toBeInTheDocument()
  })
})
