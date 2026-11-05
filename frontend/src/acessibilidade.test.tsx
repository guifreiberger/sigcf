import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import type { Ordem } from './api/tipos.ts'
import { Login } from './paginas/Login.tsx'
import { NovaOrdem } from './paginas/gestor/NovaOrdem.tsx'
import { Painel } from './paginas/gestor/Painel.tsx'
import { MinhasColetas } from './paginas/motorista/MinhasColetas.tsx'
import { apiFalsa } from './testes/apiFalsa.ts'
import { renderizar, sessaoDe } from './testes/renderizar.tsx'
import { hojeLocal } from './util/formatos.ts'

// Critérios da WCAG 2.1 (níveis A e AA) verificados pelo axe. O contraste de cores depende do
// layout renderizado, que o jsdom não tem: ele é auditado no navegador (ver docs/acessibilidade.md).
async function violacoes(alvo: Element = document.body) {
  const resultado = await axe.run(alvo, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

const hoje = hojeLocal()

const coleta = (dados: Partial<Ordem> & Pick<Ordem, 'id'>): Ordem => ({
  clienteId: 3,
  veiculoId: 4,
  motoristaId: 7,
  enderecoColeta: 'Rua Walter Marquardt, 1000',
  dataColeta: hoje,
  pesoEstimadoKg: 350,
  status: 'AGUARDANDO',
  observacao: 'Entrar pela portaria 2',
  createdAt: `${hoje}T10:00:00Z`,
  updatedAt: `${hoje}T10:00:00Z`,
  cliente: { id: 3, nome: 'WEG', telefone: '47988880000', endereco: '', ativo: true },
  veiculo: { id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true },
  motorista: { id: 7, nome: 'João da Silva', email: '', perfil: 'MOTORISTA', telefone: null, cnh: null, ativo: true },
  transicoesPermitidas: ['EM_ANDAMENTO'],
  ...dados,
})

const coletasDoDia = [
  coleta({ id: 1 }),
  coleta({ id: 2, status: 'EM_ANDAMENTO', transicoesPermitidas: ['CONCLUIDA', 'FALHA'] }),
  coleta({ id: 3, status: 'CONCLUIDA', transicoesPermitidas: [] }),
]

const disponivel = coleta({
  id: 4,
  status: 'DISPONIVEL',
  motoristaId: null,
  veiculoId: null,
  veiculo: null,
  motorista: null,
  transicoesPermitidas: [],
})

describe('acessibilidade (WCAG 2.1 AA)', () => {
  it('tela de login', async () => {
    renderizar(<Login />, { rota: '/login', caminho: '/login' })

    expect(await violacoes()).toEqual([])
  })

  it('painel do dia do gestor', async () => {
    apiFalsa({
      [`GET /ordens/resumo?data=${hoje}`]: {
        corpo: { data: hoje, total: 3, porStatus: { AGUARDANDO: 1, EM_ANDAMENTO: 1, CONCLUIDA: 1, FALHA: 0, CANCELADA: 0 } },
      },
      [`GET /ordens?data=${hoje}`]: { corpo: coletasDoDia },
      'GET /rastreamento/em-rota': { corpo: [] },
    })
    renderizar(<Painel />, { sessao: sessaoDe('GESTOR') })

    await screen.findByRole('region', { name: 'Ordens de coleta' })
    expect(await violacoes()).toEqual([])
  })

  it('formulário de nova ordem', async () => {
    apiFalsa({
      'GET /clientes?ativo=true': { corpo: [{ id: 3, nome: 'WEG', telefone: null, endereco: 'Rua A', ativo: true }] },
      'GET /veiculos?ativo=true': { corpo: [{ id: 4, placa: 'ABC1234', modelo: 'VW', capacidadeKg: 5000, ativo: true }] },
      'GET /motoristas?ativo=true': { corpo: [{ id: 7, nome: 'João', email: 'j@x', perfil: 'MOTORISTA', ativo: true }] },
    })
    renderizar(<NovaOrdem />, { sessao: sessaoDe('GESTOR') })

    await screen.findByRole('option', { name: 'WEG' })
    expect(await violacoes()).toEqual([])
  })

  it('coletas do motorista, com coletas disponíveis para aceitar', async () => {
    apiFalsa({
      [`GET /ordens/minhas?data=${hoje}`]: { corpo: coletasDoDia },
      'GET /ordens/disponiveis': { corpo: [disponivel] },
    })
    renderizar(<MinhasColetas />, { sessao: sessaoDe('MOTORISTA') })

    await screen.findByRole('heading', { name: 'Coletas disponíveis' })
    expect(await violacoes()).toEqual([])
  })

  it('diálogo de reportar falha', async () => {
    apiFalsa({ [`GET /ordens/minhas?data=${hoje}`]: { corpo: coletasDoDia } })
    renderizar(<MinhasColetas />, { sessao: sessaoDe('MOTORISTA') })

    await userEvent.click(await screen.findByRole('button', { name: 'Reportar falha' }))
    const dialogo = screen.getByRole('dialog', { name: 'Reportar falha' })

    expect(within(dialogo).getByLabelText('Motivo')).toBeInTheDocument()
    expect(await violacoes(dialogo)).toEqual([])
  })

  it('diálogo de aceitar coleta disponível', async () => {
    apiFalsa({
      [`GET /ordens/minhas?data=${hoje}`]: { corpo: [] },
      'GET /ordens/disponiveis': { corpo: [disponivel] },
      'GET /veiculos?ativo=true': { corpo: [coleta({ id: 1 }).veiculo] },
    })
    renderizar(<MinhasColetas />, { sessao: sessaoDe('MOTORISTA') })

    await userEvent.click(await screen.findByRole('button', { name: 'Aceitar coleta' }))
    const dialogo = screen.getByRole('dialog', { name: 'Aceitar coleta' })

    await within(dialogo).findByRole('option', { name: /ABC-1234/ })
    expect(await violacoes(dialogo)).toEqual([])
  })
})
