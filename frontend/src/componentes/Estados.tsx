import { CircleAlert, Inbox, LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <p className="estado" role="status">
      <LoaderCircle size={18} className="girar" aria-hidden />
      {texto}
    </p>
  )
}

export function MensagemErro({ erro }: { erro: unknown }) {
  if (!erro) return null
  const texto = erro instanceof Error ? erro.message : 'Ocorreu um erro inesperado.'
  return (
    <p className="alerta alerta--erro" role="alert">
      <CircleAlert size={18} aria-hidden />
      <span>{texto}</span>
    </p>
  )
}

export function Vazio({ children, icone: Icone = Inbox }: { children: ReactNode; icone?: LucideIcon }) {
  return (
    <div className="estado estado--vazio">
      <span className="estado__icone">
        <Icone size={24} aria-hidden />
      </span>
      <p>{children}</p>
    </div>
  )
}
