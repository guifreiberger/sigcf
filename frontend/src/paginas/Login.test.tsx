import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { apiFalsa, corpoEnviado } from '../testes/apiFalsa.ts'
import { renderizar, sessaoDe } from '../testes/renderizar.tsx'
import { Login } from './Login.tsx'

const rotaAtual = () => screen.getByRole('status', { name: 'Rota atual' })

async function preencher(email: string, senha: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), email)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
}

describe('Login', () => {
  it.each([
    ['GESTOR', '/gestor'],
    ['MOTORISTA', '/motorista'],
  ] as const)('leva o %s para a área dele depois de entrar', async (perfil, destino) => {
    const { usuario } = sessaoDe(perfil)
    const fetchFalso = apiFalsa({ 'POST /auth/login': { corpo: { accessToken: 'token', usuario } } })
    renderizar(<Login />, { rota: '/login', caminho: '/login' })

    await preencher(usuario.email, 'senha-correta')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('status', { name: 'Rota atual' })).toHaveTextContent(destino)
    expect(corpoEnviado(fetchFalso, 'POST /auth/login')).toEqual({
      email: usuario.email,
      senha: 'senha-correta',
    })
  })

  it('mostra o erro e permite tentar de novo', async () => {
    apiFalsa({ 'POST /auth/login': { status: 401, corpo: { message: 'E-mail ou senha inválidos.' } } })
    renderizar(<Login />, { rota: '/login', caminho: '/login' })

    await preencher('gestor@sigcf.local', 'errada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('alterna a exibição da senha', async () => {
    renderizar(<Login />, { rota: '/login', caminho: '/login' })
    const senha = screen.getByLabelText('Senha')

    expect(senha).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(senha).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(senha).toHaveAttribute('type', 'password')
  })

  it('redireciona quem já está logado', () => {
    renderizar(<Login />, { rota: '/login', caminho: '/login', sessao: sessaoDe('MOTORISTA') })

    expect(rotaAtual()).toHaveTextContent('/motorista')
  })
})
