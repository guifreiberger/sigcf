import { Link, useNavigate } from 'react-router'
import type { Ordem } from '../../api/tipos.ts'
import { StatusBadge } from '../../componentes/StatusBadge.tsx'
import { formatarData, formatarKg, formatarPlaca } from '../../util/formatos.ts'

export function TabelaOrdens({ ordens, mostrarData = false }: { ordens: Ordem[]; mostrarData?: boolean }) {
  const navegar = useNavigate()

  return (
    <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Ordens de coleta">
      <table className="tabela tabela--clicavel">
        <thead>
          <tr>
            <th>Nº</th>
            {mostrarData && <th>Data</th>}
            <th>Cliente</th>
            <th>Motorista</th>
            <th>Veículo</th>
            <th>Peso est.</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {ordens.map((o) => (
            <tr key={o.id} onClick={() => navegar(`/gestor/ordens/${o.id}`)}>
              <td>
                <Link to={`/gestor/ordens/${o.id}`} onClick={(e) => e.stopPropagation()}>
                  #{o.id}
                </Link>
              </td>
              {mostrarData && <td>{formatarData(o.dataColeta)}</td>}
              <td className="tabela__principal">
                <strong>{o.cliente.nome}</strong>
                <small className="texto-suave" title={o.enderecoColeta}>
                  {o.enderecoColeta}
                </small>
              </td>
              <td>{o.motorista?.nome ?? <span className="texto-suave">Aguardando aceite</span>}</td>
              <td>{o.veiculo ? formatarPlaca(o.veiculo.placa) : '—'}</td>
              <td>{o.pesoEstimadoKg != null ? formatarKg(o.pesoEstimadoKg) : '—'}</td>
              <td>
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
