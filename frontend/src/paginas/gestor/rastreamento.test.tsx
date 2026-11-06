import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Historico, MotoristaEmRota, Ordem, Trajeto } from '../../api/tipos.ts'
import { apiFalsa } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { formatarHora } from '../../util/formatos.ts'
import { DetalheOrdem } from './DetalheOrdem.tsx'
import { EmRota } from './EmRota.tsx'
import { TrajetoDaOrdem } from './TrajetoDaOrdem.tsx'

const INICIO = '2026-11-04T15:00:00.000Z'
const FIM = '2026-11-04T15:42:00.000Z'

const passo = (id: number, statusAnterior: Historico['statusAnterior'], statusNovo: Historico['statusNovo']) =>
  ({
    id,
    statusAnterior,
    statusNovo,
    motivo: null,
    latitude: null,
    longitude: null,
    precisaoMetros: null,
    createdAt: INICIO,
    usuario: { id: 7, nome: 'João da Silva', perfil: 'MOTORISTA' },
  }) satisfies Historico

const iniciada = [passo(1, null, 'AGUARDANDO'), passo(2, 'AGUARDANDO', 'EM_ANDAMENTO')]

function ordem(dados: Partial<Ordem> = {}): Ordem {
  return {
    id: 10,
    clienteId: 3,
    veiculoId: 4,
    motoristaId: 7,
    enderecoColeta: 'Rua Walter Marquardt, 1000',
    dataColeta: '2026-11-04',
    pesoEstimadoKg: null,
    pesoRealKg: null,
    distanciaMetros: null,
    duracaoSegundos: null,
    status: 'EM_ANDAMENTO',
    observacao: null,
    createdAt: INICIO,
    updatedAt: INICIO,
    cliente: { id: 3, nome: 'WEG', telefone: null, endereco: '', ativo: true },
    veiculo: { id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true },
    motorista: { id: 7, nome: 'João da Silva', email: '', perfil: 'MOTORISTA', telefone: null, cnh: null, veiculoPadraoId: null, ativo: true },
    criadoPor: { id: 1, nome: 'Ana Souza' },
    historico: iniciada,
    transicoesPermitidas: ['CANCELADA'],
    ...dados,
  }
}

const leitura = (latitude: number, registradoEm: string) => ({
  latitude,
  longitude: -49.0713,
  precisaoMetros: 8,
  registradoEm,
})

function trajeto(dados: Partial<Trajeto> = {}): Trajeto {
  const pontos = [leitura(-26.4851, '2026-11-04T15:01:00.000Z'), leitura(-26.4811, '2026-11-04T15:05:00.000Z')]
  return {
    ordemId: 10,
    status: 'EM_ANDAMENTO',
    inicio: INICIO,
    fim: null,
    distanciaMetros: 445,
    duracaoSegundos: 1800,
    ultimaPosicao: pontos[1],
    pontos,
    ...dados,
  }
}

const verTrajeto = (o: Ordem) => renderizar(<TrajetoDaOrdem ordem={o} />, { sessao: sessaoDe('GESTOR') })

describe('acompanhamento do trajeto pelo gestor', () => {
  describe('TrajetoDaOrdem', () => {
    it('não aparece enquanto o motorista não inicia a coleta', () => {
      const fetchFalso = apiFalsa({})
      verTrajeto(ordem({ status: 'AGUARDANDO', historico: [passo(1, null, 'AGUARDANDO')] }))

      expect(screen.queryByText('Trajeto da coleta')).not.toBeInTheDocument()
      expect(fetchFalso).not.toHaveBeenCalled()
    })

    it('mostra ao vivo a posição e o caminho de quem está em coleta', async () => {
      apiFalsa({ 'GET /rastreamento/ordens/10': { corpo: trajeto() } })
      verTrajeto(ordem())

      expect(await screen.findByText('Ao vivo')).toBeInTheDocument()
      expect(screen.getByText('Em andamento há').nextElementSibling).toHaveTextContent('30 min')
      expect(screen.getByText('Distância percorrida').nextElementSibling).toHaveTextContent('445 m')
      expect(screen.getByText('Início').nextElementSibling).toHaveTextContent(formatarHora(Date.parse(INICIO)))
      expect(await screen.findByRole('region', { name: 'Mapa do trajeto da coleta' })).toBeInTheDocument()
    })

    it('guarda o trajeto e o tempo da corrida depois de concluída', async () => {
      apiFalsa({
        'GET /rastreamento/ordens/10': {
          corpo: trajeto({ status: 'CONCLUIDA', fim: FIM, duracaoSegundos: 2520, distanciaMetros: 3420 }),
        },
      })
      verTrajeto(ordem({ status: 'CONCLUIDA' }))

      expect(await screen.findByText('Duração')).toBeInTheDocument()
      expect(screen.getByText('Duração').nextElementSibling).toHaveTextContent('42 min')
      expect(screen.getByText('Distância percorrida').nextElementSibling).toHaveTextContent('3,4 km')
      expect(screen.getByText('Fim').nextElementSibling).toHaveTextContent(formatarHora(Date.parse(FIM)))
      expect(screen.queryByText('Ao vivo')).not.toBeInTheDocument()
    })

    it('explica quando a coleta terminou sem nenhum ponto de GPS', async () => {
      apiFalsa({
        'GET /rastreamento/ordens/10': {
          corpo: trajeto({ status: 'CONCLUIDA', fim: FIM, pontos: [], ultimaPosicao: null, distanciaMetros: 0 }),
        },
      })
      verTrajeto(ordem({ status: 'CONCLUIDA' }))

      expect(await screen.findByText(/Nenhum trajeto registrado/)).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Mapa do trajeto da coleta' })).not.toBeInTheDocument()
    })

    it('aguarda a primeira posição logo depois do início', async () => {
      apiFalsa({ 'GET /rastreamento/ordens/10': { corpo: trajeto({ pontos: [], ultimaPosicao: null }) } })
      verTrajeto(ordem())

      expect(await screen.findByText(/Aguardando a primeira posição/)).toBeInTheDocument()
    })

    it('atualiza o status da ordem quando o motorista conclui durante o acompanhamento', async () => {
      let consultasDaOrdem = 0
      apiFalsa({
        'GET /ordens/10': () => ({
          corpo: ++consultasDaOrdem === 1 ? ordem() : ordem({ status: 'CONCLUIDA', transicoesPermitidas: [] }),
        }),
        'GET /rastreamento/ordens/10': { corpo: trajeto({ status: 'CONCLUIDA', fim: FIM }) },
      })
      renderizar(<DetalheOrdem />, { rota: '/gestor/ordens/10', caminho: '/gestor/ordens/:id', sessao: sessaoDe('GESTOR') })

      expect(await screen.findByText('Concluída', { selector: '.badge' })).toBeInTheDocument()
      expect(consultasDaOrdem).toBe(2)
    })
  })

  describe('EmRota', () => {
    const emRota = (dados: Partial<MotoristaEmRota>): MotoristaEmRota => ({
      ordemId: 10,
      motorista: { id: 7, nome: 'João da Silva' },
      cliente: 'WEG',
      enderecoColeta: 'Rua Walter Marquardt, 1000',
      placa: 'ABC1234',
      inicio: INICIO,
      ultimaPosicao: leitura(-26.4851, new Date().toISOString()),
      ...dados,
    })

    it('lista quem está em coleta, com link para o detalhe', async () => {
      apiFalsa({
        'GET /rastreamento/em-rota': {
          corpo: [
            emRota({}),
            emRota({ ordemId: 11, motorista: { id: 8, nome: 'Maria Lima' }, cliente: 'Malwee', ultimaPosicao: null }),
          ],
        },
      })
      renderizar(<EmRota />, { sessao: sessaoDe('GESTOR') })

      const joao = await screen.findByRole('link', { name: /João da Silva/ })
      expect(joao).toHaveAttribute('href', '/gestor/ordens/10')
      expect(joao).toHaveTextContent('WEG · ABC-1234')
      expect(joao).toHaveTextContent('Posição recebida agora há pouco')
      expect(screen.getByRole('link', { name: /Maria Lima/ })).toHaveTextContent('Ainda sem posição do celular')
      expect(screen.getByText('2 coletas em andamento')).toBeInTheDocument()
      expect(await screen.findByRole('region', { name: 'Mapa dos motoristas em coleta' })).toBeInTheDocument()
    })

    it('informa quando ninguém está em coleta', async () => {
      apiFalsa({ 'GET /rastreamento/em-rota': { corpo: [] } })
      renderizar(<EmRota />, { sessao: sessaoDe('GESTOR') })

      expect(await screen.findByText('Nenhum motorista em coleta agora.')).toBeInTheDocument()
    })
  })
})
