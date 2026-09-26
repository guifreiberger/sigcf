import { type ReactNode, useEffect, useRef } from 'react'

interface Props {
  aberto: boolean
  titulo: string
  aoFechar: () => void
  children: ReactNode
}

export function Dialogo({ aberto, titulo, aoFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) dialogo.showModal()
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  return (
    <dialog ref={ref} className="dialogo" onClose={aoFechar} aria-labelledby="dialogo-titulo">
      <header className="dialogo__topo">
        <h2 id="dialogo-titulo">{titulo}</h2>
        <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar">
          ×
        </button>
      </header>
      {aberto && children}
    </dialog>
  )
}
