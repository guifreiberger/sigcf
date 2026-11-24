import { CapacitorHttp } from '@capacitor/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ehAppNativo } from '../nativo/plataforma.ts'
import { apiFalsa } from '../testes/apiFalsa.ts'
import { sessaoDe } from '../testes/renderizar.tsx'
import {
  api,
  ApiError,
  definirAoExpirarSessao,
  lerSessao,
  montarQuery,
  salvarSessao,
} from './cliente.ts'

vi.mock('../nativo/plataforma.ts', () => ({ ehAppNativo: vi.fn(() => false) }))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  CapacitorHttp: { request: vi.fn() },
}))

const respostaNativa = (status: number, data: unknown) => ({ status, data, headers: {}, url: '' })

describe('cliente da API', () => {
  describe('sessão', () => {
    it('salva, lê e apaga a sessão do navegador', () => {
      const sessao = sessaoDe('GESTOR')

      salvarSessao(sessao)
      expect(lerSessao()).toEqual(sessao)

      salvarSessao(null)
      expect(lerSessao()).toBeNull()
    })

    it('ignora uma sessão corrompida', () => {
      localStorage.setItem('sigcf.sessao', '{inválido')

      expect(lerSessao()).toBeNull()
    })
  })

  describe('api', () => {
    it('chama o backend sob /api e devolve o JSON', async () => {
      const fetchFalso = apiFalsa({ 'GET /clientes': { corpo: [{ id: 1 }] } })

      await expect(api('/clientes')).resolves.toEqual([{ id: 1 }])
      expect(fetchFalso).toHaveBeenCalledWith('/api/clientes', {
        method: 'GET',
        headers: {},
        body: undefined,
      })
    })

    it('envia o token da sessão e o corpo em JSON', async () => {
      salvarSessao(sessaoDe('GESTOR'))
      const fetchFalso = apiFalsa({ 'POST /clientes': { corpo: { id: 2 } } })

      await api('/clientes', { metodo: 'POST', corpo: { nome: 'WEG' } })

      expect(fetchFalso).toHaveBeenCalledWith('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-gestor' },
        body: '{"nome":"WEG"}',
      })
    })

    it('devolve undefined nas respostas sem conteúdo', async () => {
      apiFalsa({ 'DELETE /clientes/1': { status: 204 } })

      await expect(api('/clientes/1', { metodo: 'DELETE' })).resolves.toBeUndefined()
    })

    it('junta as mensagens de validação do backend', async () => {
      apiFalsa({
        'POST /clientes': {
          status: 400,
          corpo: { message: ['nome should not be empty', 'endereco must be a string'] },
        },
      })

      await expect(api('/clientes', { metodo: 'POST', corpo: {} })).rejects.toEqual(
        new ApiError(400, 'nome should not be empty\nendereco must be a string'),
      )
    })

    it('usa a mensagem única do backend ou o código do erro', async () => {
      apiFalsa({
        'GET /ordens/9': { status: 404, corpo: { message: 'Ordem de coleta não encontrada.' } },
        'GET /ordens/resumo': { status: 502 },
      })

      await expect(api('/ordens/9')).rejects.toMatchObject({
        status: 404,
        message: 'Ordem de coleta não encontrada.',
      })
      await expect(api('/ordens/resumo')).rejects.toMatchObject({
        status: 502,
        message: 'Erro 502',
      })
    })

    it('traduz a falta de conexão em uma mensagem amigável', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      await expect(api('/clientes')).rejects.toMatchObject({
        status: 0,
        message: expect.stringContaining('Sem conexão'),
      })
    })

    it('encerra a sessão quando o token expira', async () => {
      const aoExpirar = vi.fn()
      definirAoExpirarSessao(aoExpirar)
      salvarSessao(sessaoDe('MOTORISTA'))
      apiFalsa({ 'GET /ordens/minhas': { status: 401, corpo: { message: 'Token inválido ou expirado.' } } })

      await expect(api('/ordens/minhas')).rejects.toBeInstanceOf(ApiError)
      expect(aoExpirar).toHaveBeenCalledOnce()
    })

    it('não encerra sessão no 401 do login, quando ainda não há sessão', async () => {
      const aoExpirar = vi.fn()
      definirAoExpirarSessao(aoExpirar)
      apiFalsa({ 'POST /auth/login': { status: 401, corpo: { message: 'E-mail ou senha inválidos.' } } })

      await expect(api('/auth/login', { metodo: 'POST', corpo: {} })).rejects.toThrow(
        'E-mail ou senha inválidos.',
      )
      expect(aoExpirar).not.toHaveBeenCalled()
    })
  })

  describe('no app Android', () => {
    const httpNativo = vi.mocked(CapacitorHttp.request)

    beforeEach(() => {
      vi.mocked(ehAppNativo).mockReturnValue(true)
      vi.stubEnv('VITE_API_URL', 'https://sigcf.exemplo/api')
    })

    afterEach(() => {
      vi.mocked(ehAppNativo).mockReturnValue(false)
      httpNativo.mockReset()
      vi.unstubAllEnvs()
    })

    it('chama o endereço completo da API pelo HTTP nativo, que o Android não limita em segundo plano', async () => {
      salvarSessao(sessaoDe('MOTORISTA'))
      const fetchFalso = vi.fn()
      vi.stubGlobal('fetch', fetchFalso)
      httpNativo.mockResolvedValue(respostaNativa(200, [{ id: 1 }]))

      await expect(api('/rastreamento/pontos', { metodo: 'POST', corpo: { pontos: [] } })).resolves.toEqual([
        { id: 1 },
      ])

      expect(httpNativo).toHaveBeenCalledWith({
        url: 'https://sigcf.exemplo/api/rastreamento/pontos',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-motorista' },
        data: { pontos: [] },
        connectTimeout: 15_000,
        readTimeout: 20_000,
      })
      expect(fetchFalso).not.toHaveBeenCalled()
    })

    // Sem tempo-limite, o Android espera para sempre por uma conexão que caiu (ex.: ao trocar
    // do Wi-Fi para o 4G) e a fila do trajeto para de ser enviada até o app ser fechado.
    it('desiste de uma chamada presa numa conexão que caiu, para a próxima tentativa sair', async () => {
      httpNativo.mockRejectedValue(new Error('SocketTimeoutException: Read timed out'))

      await expect(api('/rastreamento/pontos', { metodo: 'POST', corpo: { pontos: [] } })).rejects.toMatchObject({
        status: 0,
      })
      expect(httpNativo).toHaveBeenCalledWith(
        expect.objectContaining({ connectTimeout: expect.any(Number), readTimeout: expect.any(Number) }),
      )
    })

    it('entende o JSON que chega como texto', async () => {
      httpNativo.mockResolvedValue(respostaNativa(200, '{"id":3}'))

      await expect(api('/ordens/3')).resolves.toEqual({ id: 3 })
    })

    it('traduz os erros como no navegador', async () => {
      httpNativo.mockResolvedValue(respostaNativa(409, { message: 'Nenhuma coleta em andamento.' }))

      await expect(api('/rastreamento/pontos', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({
        status: 409,
        message: 'Nenhuma coleta em andamento.',
      })
    })

    it('devolve undefined no 204 e trata a falta de conexão', async () => {
      httpNativo.mockResolvedValueOnce(respostaNativa(204, ''))
      await expect(api('/clientes/1', { metodo: 'DELETE' })).resolves.toBeUndefined()

      httpNativo.mockRejectedValueOnce(new Error('UnknownHostException'))
      await expect(api('/clientes')).rejects.toMatchObject({ status: 0 })
    })
  })

  it('montarQuery ignora parâmetros vazios', () => {
    expect(montarQuery({ data: '2026-11-04', status: '', motoristaId: undefined, ativo: false })).toBe(
      '?data=2026-11-04&ativo=false',
    )
    expect(montarQuery({ status: '' })).toBe('')
  })
})
