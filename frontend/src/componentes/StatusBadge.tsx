import type { StatusOrdem } from '../api/tipos.ts'
import { ROTULO_STATUS } from '../util/formatos.ts'

export function StatusBadge({ status }: { status: StatusOrdem }) {
  return <span className={`badge badge--${status.toLowerCase()}`}>{ROTULO_STATUS[status]}</span>
}
