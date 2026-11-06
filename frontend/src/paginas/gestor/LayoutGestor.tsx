import {
  Building2,
  ChartColumn,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Truck,
  Users,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { iniciais } from '../../util/formatos.ts'

const LINKS: { para: string; rotulo: string; icone: LucideIcon; exato?: boolean }[] = [
  { para: '/gestor', rotulo: 'Painel do dia', icone: LayoutDashboard, exato: true },
  { para: '/gestor/dashboard', rotulo: 'Dashboard', icone: ChartColumn },
  { para: '/gestor/ordens', rotulo: 'Ordens de coleta', icone: ClipboardList },
  { para: '/gestor/relatorios', rotulo: 'Relatórios', icone: FileSpreadsheet },
  { para: '/gestor/motoristas', rotulo: 'Motoristas', icone: Users },
  { para: '/gestor/veiculos', rotulo: 'Veículos', icone: Truck },
  { para: '/gestor/clientes', rotulo: 'Clientes', icone: Building2 },
]

export function LayoutGestor() {
  const { usuario, sair } = useAuth()

  return (
    <div className="gestor">
      <aside className="gestor__menu">
        <div className="marca gestor__marca">
          <span className="marca__icone">
            <Truck size={20} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="marca__textos">
            <strong className="marca__nome">SIGCF</strong>
            <span className="marca__sub">Gestão de coleta e frota</span>
          </span>
        </div>

        <nav className="gestor__nav" aria-label="Menu principal">
          {LINKS.map(({ para, rotulo, icone: Icone, exato }) => (
            <NavLink key={para} to={para} end={exato} className="gestor__link">
              <Icone size={18} aria-hidden />
              {rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="gestor__usuario">
          <span className="avatar" aria-hidden>
            {iniciais(usuario?.nome ?? '')}
          </span>
          <span className="gestor__usuario-info">
            <strong title={usuario?.email}>{usuario?.nome}</strong>
            <small>Gestor</small>
          </span>
          <button type="button" className="botao-icone botao-icone--claro" onClick={sair} aria-label="Sair" title="Sair">
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </aside>
      <main className="gestor__conteudo">
        <Outlet />
      </main>
    </div>
  )
}
