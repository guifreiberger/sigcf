import { createContext } from 'react'
import type { Perfil, UsuarioSessao } from '../api/tipos.ts'

export interface ValorAuth {
  usuario: UsuarioSessao | null
  entrar: (email: string, senha: string) => Promise<UsuarioSessao>
  sair: () => void
}

export const AuthContext = createContext<ValorAuth | null>(null)

export const rotaInicial = (perfil: Perfil) => (perfil === 'GESTOR' ? '/gestor' : '/motorista')
