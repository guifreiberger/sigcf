import { renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { api, lerSessao } from '../api/cliente.ts'
import { apiFalsa, corpoEnviado } from '../testes/apiFalsa.ts'
import { renderizar, RotaAtual, sessaoDe } from '../testes/renderizar.tsx'
import { rotaInicial } from './contexto.ts'
import { RotaProtegida } from './RotaProtegida.tsx'
import { useAuth } from './useAuth.ts'

function Conta() {
  const { usuario, entrar, sair } = useAuth()
  return (
    <div>
      <p>{usuario ? `Logado como ${usuario.nome}` : 'Ninguém logado'}</p>
      <button type="button" onClick={() => entrar('gestor@sigcf.local', 'senha')}>
        Entrar
      </button>
      <button type="button" onClick={sair}>
        Sair
      </button>
      <button type="button" onClick={() => api('/auth/me').catch(() => undefined)}>
        Consultar
      </button>
    </div>
  )
}

function rotasProtegidas() {
  return (
    <Routes>
      <Route element={<RotaProtegida perfil="GESTOR" />}>
        <Route path="/gestor" element={<p>Painel do gestor</p>} />
      </Route>
      <Route path="*" element={<RotaAtual />} />
    </Routes>
  )
}

describe('autenticação', () => {
  it('rotaInicial leva cada perfil para a sua área', () => {
    expect(rotaInicial('GESTOR')).toBe('/gestor')
    expect(rotaInicial('MOTORISTA')).toBe('/motorista')
  })

  it('useAuth exige o AuthProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow('useAuth precisa estar dentro de <AuthProvider>.')
  })

  describe('AuthProvider', () => {
    it('entra, guarda a sessão e expõe o usuário', async () => {
      const { usuario } = sessaoDe('GESTOR')
      const fetchFalso = apiFalsa({
        'POST /auth/login': { corpo: { accessToken: 'token-novo', usuario } },
      })
      renderizar(<Conta />)

      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(await screen.findByText('Logado como Ana Souza')).toBeInTheDocument()
      expect(corpoEnviado(fetchFalso, 'POST /auth/login')).toEqual({
        email: 'gestor@sigcf.local',
        senha: 'senha',
      })
      expect(lerSessao()).toEqual({ token: 'token-novo', usuario })
    })

    it('recupera a sessão salva ao abrir o app', () => {
      renderizar(<Conta />, { sessao: sessaoDe('MOTORISTA') })

      expect(screen.getByText('Logado como João da Silva')).toBeInTheDocument()
    })

    it('sai apagando a sessão', async () => {
      renderizar(<Conta />, { sessao: sessaoDe('GESTOR') })

      await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

      expect(screen.getByText('Ninguém logado')).toBeInTheDocument()
      expect(lerSessao()).toBeNull()
    })

    it('sai sozinho quando o backend informa que o token expirou', async () => {
      apiFalsa({ 'GET /auth/me': { status: 401, corpo: { message: 'Token inválido ou expirado.' } } })
      renderizar(<Conta />, { sessao: sessaoDe('GESTOR') })

      await userEvent.click(screen.getByRole('button', { name: 'Consultar' }))

      expect(await screen.findByText('Ninguém logado')).toBeInTheDocument()
    })
  })

  describe('RotaProtegida', () => {
    it('manda para o login quem não está autenticado', () => {
      renderizar(rotasProtegidas(), { rota: '/gestor' })

      expect(screen.getByRole('status', { name: 'Rota atual' })).toHaveTextContent('/login')
    })

    it('manda o motorista de volta para a área dele', () => {
      renderizar(rotasProtegidas(), { rota: '/gestor', sessao: sessaoDe('MOTORISTA') })

      expect(screen.getByRole('status', { name: 'Rota atual' })).toHaveTextContent('/motorista')
    })

    it('libera o perfil certo', () => {
      renderizar(rotasProtegidas(), { rota: '/gestor', sessao: sessaoDe('GESTOR') })

      expect(screen.getByText('Painel do gestor')).toBeInTheDocument()
    })
  })
})
