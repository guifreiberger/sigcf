import { Navigate, Outlet } from 'react-router'
import type { Perfil } from '../api/tipos.ts'
import { rotaInicial } from './contexto.ts'
import { useAuth } from './useAuth.ts'

export function RotaProtegida({ perfil }: { perfil: Perfil }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.perfil !== perfil) return <Navigate to={rotaInicial(usuario.perfil)} replace />
  return <Outlet />
}
