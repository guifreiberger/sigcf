import { Navigate, Route, Routes } from 'react-router'
import { rotaInicial } from './auth/contexto.ts'
import { RotaProtegida } from './auth/RotaProtegida.tsx'
import { useAuth } from './auth/useAuth.ts'
import { LayoutGestor } from './paginas/gestor/LayoutGestor.tsx'
import { Painel } from './paginas/gestor/Painel.tsx'
import { Login } from './paginas/Login.tsx'

function Inicio() {
  const { usuario } = useAuth()
  return <Navigate to={usuario ? rotaInicial(usuario.perfil) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RotaProtegida perfil="GESTOR" />}>
        <Route path="/gestor" element={<LayoutGestor />}>
          <Route index element={<Painel />} />
        </Route>
      </Route>

      <Route path="*" element={<Inicio />} />
    </Routes>
  )
}
