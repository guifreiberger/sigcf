import type { ReactNode } from 'react'

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <p className="estado" role="status">
      {texto}
    </p>
  )
}

export function MensagemErro({ erro }: { erro: unknown }) {
  if (!erro) return null
  const texto = erro instanceof Error ? erro.message : 'Ocorreu um erro inesperado.'
  return (
    <p className="alerta alerta--erro" role="alert">
      {texto}
    </p>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="estado estado--vazio">{children}</p>
}
