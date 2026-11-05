import { Ban, CircleCheck, Clock, type LucideProps, TriangleAlert, Truck } from 'lucide-react'
import type { StatusOrdem } from '../api/tipos.ts'

const ICONES = {
  AGUARDANDO: Clock,
  EM_ANDAMENTO: Truck,
  CONCLUIDA: CircleCheck,
  FALHA: TriangleAlert,
  CANCELADA: Ban,
}

export function IconeStatus({ status, ...props }: { status: StatusOrdem } & LucideProps) {
  const Icone = ICONES[status]
  return <Icone aria-hidden {...props} />
}
