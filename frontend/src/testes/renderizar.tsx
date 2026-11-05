import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { salvarSessao } from '../api/cliente.ts'
import type { Perfil, Sessao } from '../api/tipos.ts'
import { AuthProvider } from '../auth/AuthProvider.tsx'

export const sessaoDe = (perfil: Perfil): Sessao => ({
  token: `token-${perfil.toLowerCase()}`,
  usuario:
    perfil === 'GESTOR'
      ? { id: 1, nome: 'Ana Souza', email: 'gestor@sigcf.local', perfil }
      : { id: 7, nome: 'João da Silva', email: 'joao@sigcf.local', perfil },
})

// Mostra a rota atual para os testes conferirem redirecionamentos.
export function RotaAtual() {
  return <output aria-label="Rota atual">{useLocation().pathname}</output>
}

interface Opcoes {
  rota?: string
  caminho?: string
  sessao?: Sessao
}

// Monta a página com as mesmas camadas do main.tsx: consultas, rotas e autenticação.
export function renderizar(pagina: ReactNode, { rota = '/', caminho = '*', sessao }: Opcoes = {}) {
  if (sessao) salvarSessao(sessao)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[rota]}>
        <AuthProvider>
          <Routes>
            <Route path={caminho} element={pagina} />
            <Route path="*" element={<RotaAtual />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
