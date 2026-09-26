import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { api, definirAoExpirarSessao, lerSessao, salvarSessao } from '../api/cliente.ts'
import type { Sessao, UsuarioSessao } from '../api/tipos.ts'
import { AuthContext } from './contexto.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessao)
  const queryClient = useQueryClient()

  const sair = useCallback(() => {
    salvarSessao(null)
    setSessao(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => definirAoExpirarSessao(sair), [sair])

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await api<{ accessToken: string; usuario: UsuarioSessao }>('/auth/login', {
      metodo: 'POST',
      corpo: { email, senha },
    })
    const nova = { token: resposta.accessToken, usuario: resposta.usuario }
    salvarSessao(nova)
    setSessao(nova)
    return nova.usuario
  }, [])

  const valor = useMemo(
    () => ({ usuario: sessao?.usuario ?? null, entrar, sair }),
    [sessao, entrar, sair],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
