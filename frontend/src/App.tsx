import { Navigate, Route, Routes } from 'react-router'
import { rotaInicial } from './auth/contexto.ts'
import { RotaProtegida } from './auth/RotaProtegida.tsx'
import { useAuth } from './auth/useAuth.ts'
import { Clientes, Motoristas, Veiculos } from './paginas/gestor/Cadastros.tsx'
import { DetalheOrdem } from './paginas/gestor/DetalheOrdem.tsx'
import { LayoutGestor } from './paginas/gestor/LayoutGestor.tsx'
import { NovaOrdem } from './paginas/gestor/NovaOrdem.tsx'
import { Ordens } from './paginas/gestor/Ordens.tsx'
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
          <Route path="ordens" element={<Ordens />} />
          <Route path="ordens/nova" element={<NovaOrdem />} />
          <Route path="ordens/:id" element={<DetalheOrdem />} />
          <Route path="motoristas" element={<Motoristas />} />
          <Route path="veiculos" element={<Veiculos />} />
          <Route path="clientes" element={<Clientes />} />
        </Route>
      </Route>

      <Route path="*" element={<Inicio />} />
    </Routes>
  )
}
