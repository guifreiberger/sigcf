import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'

const LINKS = [
  { para: '/gestor', rotulo: 'Painel do dia', exato: true },
  { para: '/gestor/inteligencia', rotulo: 'Inteligência' },
  { para: '/gestor/ordens', rotulo: 'Ordens de coleta' },
  { para: '/gestor/motoristas', rotulo: 'Motoristas' },
  { para: '/gestor/veiculos', rotulo: 'Veículos' },
  { para: '/gestor/clientes', rotulo: 'Clientes' },
]

export function LayoutGestor() {
  const { usuario, sair } = useAuth()

  return (
    <div className="gestor">
      <aside className="gestor__menu">
        <div className="gestor__marca">
          <img src="/favicon.svg" alt="" width={32} height={32} />
          <strong>SIGCF</strong>
        </div>
        <nav className="gestor__nav" aria-label="Menu principal">
          {LINKS.map((link) => (
            <NavLink key={link.para} to={link.para} end={link.exato} className="gestor__link">
              {link.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="gestor__usuario">
          <span title={usuario?.email}>{usuario?.nome}</span>
          <button type="button" className="botao botao--fantasma" onClick={sair}>
            Sair
          </button>
        </div>
      </aside>
      <main className="gestor__conteudo">
        <Outlet />
      </main>
    </div>
  )
}
