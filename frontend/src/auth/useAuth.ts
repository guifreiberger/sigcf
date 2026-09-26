import { useContext } from 'react'
import { AuthContext } from './contexto.ts'

export function useAuth() {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return valor
}
