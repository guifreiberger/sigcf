import { Navigate, Route, Routes } from 'react-router'
import { rotaInicial } from './auth/contexto.ts'
import { useAuth } from './auth/useAuth.ts'
import { Login } from './paginas/Login.tsx'

function Inicio() {
  const { usuario } = useAuth()
  return <Navigate to={usuario ? rotaInicial(usuario.perfil) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="*" element={<Inicio />} />
    </Routes>
  )
}
