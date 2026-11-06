import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lerSessao } from '../../api/cliente.ts'
import type { Ordem } from '../../api/tipos.ts'
import { apiFalsa, corpoEnviado } from '../../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { hojeLocal } from '../../util/formatos.ts'
import { MinhasColetas } from './MinhasColetas.tsx'

// Por padrão a tela roda como no navegador; os testes do app Android ligam o modo nativo.
const app = vi.hoisted(() => ({
  nativo: false,
  aoFalhar: null as ((motivo: 'sem-permissao' | 'outro') => void) | null,
  abrirConfiguracoes: vi.fn(),
}))
vi.mock('../../nativo/plataforma.ts', () => ({ ehAppNativo: () => app.nativo }))
vi.mock('../../nativo/avisosNoApp.ts', () => ({ ativarAvisosNoApp: async () => 'ativo' }))
vi.mock('../../nativo/gpsEmSegundoPlano.ts', () => ({
  acompanharEmSegundoPlano: (_aoLer: unknown, aoFalhar: typeof app.aoFalhar) => {
    app.aoFalhar = aoFalhar
    return () => {}
  },
  abrirConfiguracoesDoApp: app.abrirConfiguracoes,
}))

const MINHAS = `GET /ordens/minhas?data=${hojeLocal()}`

function ordem(dados: Partial<Ordem> & Pick<Ordem, 'id'>): Ordem {
  return {
    clienteId: 3,
    veiculoId: 4,
    motoristaId: 7,
    enderecoColeta: 'Rua Walter Marquardt, 1000',
    dataColeta: hojeLocal(),
    pesoEstimadoKg: null,
    status: 'AGUARDANDO',
    observacao: null,
    createdAt: '',
    updatedAt: '',
    cliente: { id: 3, nome: 'WEG', telefone: null, endereco: '', ativo: true },
    veiculo: { id: 4, placa: 'ABC1234', modelo: 'VW Delivery', capacidadeKg: 5000, ativo: true },
    transicoesPermitidas: ['EM_ANDAMENTO'],
    ...dados,
  }
}

const aguardando = ordem({ id: 1, cliente: { id: 3, nome: 'WEG', telefone: '47988880000', endereco: '', ativo: true } })
const emAndamento = ordem({
  id: 2,
  status: 'EM_ANDAMENTO',
  cliente: { id: 5, nome: 'Malwee', telefone: null, endereco: '', ativo: true },
  transicoesPermitidas: ['CONCLUIDA', 'FALHA'],
})
const concluida = ordem({
  id: 3,
  status: 'CONCLUIDA',
  cliente: { id: 6, nome: 'Marisol', telefone: null, endereco: '', ativo: true },
  transicoesPermitidas: [],
})

// Recursos do navegador que o jsdom não tem: GPS e consulta de permissão.
function navegadorDoCelular({ gps, permissao = 'granted' }: { gps?: GeolocationCoordinates; permissao?: string }) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (sucesso: PositionCallback, erro: PositionErrorCallback) =>
        gps ? sucesso({ coords: gps } as GeolocationPosition) : erro({ code: 1 } as GeolocationPositionError),
      watchPosition: (sucesso: PositionCallback, erro: PositionErrorCallback) => {
        if (gps) sucesso({ coords: gps, timestamp: Date.now() } as GeolocationPosition)
        else erro({ code: 1 } as GeolocationPositionError)
        return 1
      },
      clearWatch: () => {},
    },
  })
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: async () => ({ state: permissao }) },
  })
}

const abrir = () => renderizar(<MinhasColetas />, { sessao: sessaoDe('MOTORISTA') })

describe('MinhasColetas', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation')
    Reflect.deleteProperty(navigator, 'permissions')
  })

  it('mostra primeiro a coleta em andamento, depois as aguardando e as finalizadas', async () => {
    apiFalsa({ [MINHAS]: { corpo: [concluida, aguardando, emAndamento] } })
    abrir()

    await screen.findByText('Malwee')
    const clientes = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(clientes).toEqual(['Malwee', 'WEG', 'Marisol'])
  })

  it('resume quantas coletas faltam e o progresso do dia', async () => {
    apiFalsa({ [MINHAS]: { corpo: [concluida, aguardando, emAndamento] } })
    abrir()

    expect(await screen.findByText('2 de 3 coletas pendentes')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Coletas finalizadas' })).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText('João')).toBeInTheDocument()
  })

  it('mostra os dados que o motorista precisa em campo', async () => {
    apiFalsa({
      [MINHAS]: { corpo: [{ ...aguardando, pesoEstimadoKg: 350, observacao: 'Entrar pela portaria 2' }] },
    })
    abrir()

    expect(await screen.findByText('1 de 1 coleta pendente')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir no mapa/ })).toHaveAttribute(
      'href',
      expect.stringContaining('Rua%20Walter%20Marquardt'),
    )
    expect(screen.getByRole('link', { name: /\(47\) 98888-0000/ })).toHaveAttribute('href', 'tel:47988880000')
    expect(screen.getByText(/ABC-1234 · VW Delivery/)).toBeInTheDocument()
    expect(screen.getByText(/cerca de 350 kg/)).toBeInTheDocument()
    expect(screen.getByText('Entrar pela portaria 2')).toBeInTheDocument()
  })

  it('orienta o motorista quando não há coletas', async () => {
    apiFalsa({ [MINHAS]: { corpo: [] } })
    abrir()

    expect(await screen.findByText(/Nenhuma coleta atribuída a você hoje/)).toBeInTheDocument()
    expect(screen.getByText('Sem coletas hoje')).toBeInTheDocument()
  })

  it('inicia a coleta registrando a localização do celular', async () => {
    navegadorDoCelular({
      gps: { latitude: -26.4851, longitude: -49.0713, accuracy: 9.4 } as GeolocationCoordinates,
    })
    const fetchFalso = apiFalsa({
      [MINHAS]: { corpo: [aguardando] },
      'PATCH /ordens/1/status': { corpo: { ...aguardando, status: 'EM_ANDAMENTO' } },
    })
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar coleta' }))

    await expect.poll(() => corpoEnviado(fetchFalso, 'PATCH /ordens/1/status')).toEqual({
      status: 'EM_ANDAMENTO',
      localizacao: { latitude: -26.4851, longitude: -49.0713, precisaoMetros: 9 },
    })
  })

  it('pede confirmação antes de concluir e segue sem localização se ela for negada', async () => {
    navegadorDoCelular({ permissao: 'denied' })
    const fetchFalso = apiFalsa({
      [MINHAS]: { corpo: [emAndamento] },
      'PATCH /ordens/2/status': { corpo: { ...emAndamento, status: 'CONCLUIDA' } },
    })
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Concluir coleta' }))
    const dialogo = screen.getByRole('dialog', { name: 'Concluir coleta' })
    expect(dialogo).toHaveTextContent('Confirma a conclusão da coleta em Malwee?')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar conclusão' }))

    await expect.poll(() => corpoEnviado(fetchFalso, 'PATCH /ordens/2/status')).toEqual({ status: 'CONCLUIDA' })
    expect(await screen.findByText(/A localização está bloqueada no navegador/)).toBeInTheDocument()
  })

  it('reporta falha com um motivo frequente', async () => {
    const fetchFalso = apiFalsa({
      [MINHAS]: { corpo: [emAndamento] },
      'PATCH /ordens/2/status': { corpo: { ...emAndamento, status: 'FALHA' } },
    })
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Reportar falha' }))
    const dialogo = screen.getByRole('dialog', { name: 'Reportar falha' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cliente ausente' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Reportar falha' }))

    await expect.poll(() => corpoEnviado(fetchFalso, 'PATCH /ordens/2/status')).toEqual({
      status: 'FALHA',
      motivo: 'Cliente ausente',
    })
  })

  it('mantém o diálogo aberto e mostra o erro quando o backend recusa', async () => {
    apiFalsa({
      [MINHAS]: { corpo: [emAndamento] },
      'PATCH /ordens/2/status': {
        status: 409,
        corpo: { message: 'Não é possível alterar o status de CONCLUIDA para CONCLUIDA.' },
      },
    })
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Concluir coleta' }))
    const dialogo = screen.getByRole('dialog', { name: 'Concluir coleta' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar conclusão' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Não é possível alterar o status')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Voltar' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('compartilhamento da localização durante a coleta', () => {
    const noCaminho = { latitude: -26.4851, longitude: -49.0713, accuracy: 9 } as GeolocationCoordinates

    it('avisa o motorista enquanto compartilha a posição com o gestor', async () => {
      navegadorDoCelular({ gps: noCaminho })
      apiFalsa({ [MINHAS]: { corpo: [emAndamento] } })
      abrir()

      expect(await screen.findByText('Compartilhando sua localização com o gestor')).toBeInTheDocument()
      expect(screen.getByText(/A tela fica ligada até você concluir/)).toBeInTheDocument()
      expect(screen.getByText('1 posição aguardando conexão para envio')).toBeInTheDocument()
    })

    it('não compartilha nada sem coleta em andamento', async () => {
      navegadorDoCelular({ gps: noCaminho })
      apiFalsa({ [MINHAS]: { corpo: [aguardando, concluida] } })
      abrir()

      await screen.findByText('WEG')
      expect(screen.queryByText(/Compartilhando sua localização/)).not.toBeInTheDocument()
    })

    it('envia as posições guardadas antes de concluir, porque depois o servidor as recusa', async () => {
      navegadorDoCelular({ gps: noCaminho })
      const fetchFalso = apiFalsa({
        [MINHAS]: { corpo: [emAndamento] },
        'POST /rastreamento/pontos': { status: 204 },
        'PATCH /ordens/2/status': { corpo: { ...emAndamento, status: 'CONCLUIDA' } },
      })
      abrir()

      await userEvent.click(await screen.findByRole('button', { name: 'Concluir coleta' }))
      await userEvent.click(
        within(screen.getByRole('dialog', { name: 'Concluir coleta' })).getByRole('button', {
          name: 'Confirmar conclusão',
        }),
      )

      await expect.poll(() => corpoEnviado(fetchFalso, 'PATCH /ordens/2/status')).toBeDefined()
      const chamadas = fetchFalso.mock.calls.map(([url, init]) => `${init?.method} ${url}`)
      expect(chamadas.indexOf('POST /api/rastreamento/pontos')).toBeLessThan(
        chamadas.indexOf('PATCH /api/ordens/2/status'),
      )
      expect(corpoEnviado(fetchFalso, 'POST /rastreamento/pontos').pontos).toEqual([
        expect.objectContaining({ latitude: -26.4851, longitude: -49.0713, precisaoMetros: 9 }),
      ])
    })

    describe('no app Android', () => {
      beforeEach(() => {
        app.nativo = true
      })

      afterEach(() => {
        app.nativo = false
        app.abrirConfiguracoes.mockReset()
      })

      it('diz que o motorista pode usar o celular, porque o trajeto segue em segundo plano', async () => {
        apiFalsa({ [MINHAS]: { corpo: [emAndamento] } })
        abrir()

        expect(await screen.findByText(/Pode usar o celular normalmente/)).toBeInTheDocument()
        expect(screen.queryByText(/A tela fica ligada/)).not.toBeInTheDocument()
      })

      it('leva às configurações do app quando a localização não foi liberada', async () => {
        apiFalsa({ [MINHAS]: { corpo: [emAndamento] } })
        abrir()
        await screen.findByText('Malwee')

        act(() => app.aoFalhar?.('sem-permissao'))
        await userEvent.click(await screen.findByRole('button', { name: 'Abrir configurações' }))

        expect(app.abrirConfiguracoes).toHaveBeenCalled()
      })
    })

    it('orienta a liberar o GPS quando o celular não permite', async () => {
      navegadorDoCelular({ permissao: 'denied' })
      apiFalsa({ [MINHAS]: { corpo: [emAndamento] } })
      abrir()

      expect(await screen.findByText('Não foi possível acessar o GPS')).toBeInTheDocument()
    })
  })

  it('informa quando não consegue buscar as coletas', async () => {
    apiFalsa({ [MINHAS]: { status: 500, corpo: { message: 'Erro interno' } } })
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno')
  })

  it('sai da conta', async () => {
    apiFalsa({ [MINHAS]: { corpo: [] } })
    abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(lerSessao()).toBeNull()
  })
})
