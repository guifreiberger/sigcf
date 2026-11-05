import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef } from 'react'

interface Props {
  aberto: boolean
  titulo: string
  aoFechar: () => void
  children: ReactNode
}

export function Dialogo({ aberto, titulo, aoFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) dialogo.showModal()
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  return (
    <dialog ref={ref} className="dialogo" onClose={aoFechar} aria-labelledby={idTitulo}>
      <header className="dialogo__topo">
        <h2 id={idTitulo}>{titulo}</h2>
        <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar">
          <X size={20} aria-hidden />
        </button>
      </header>
      {aberto && children}
    </dialog>
  )
}
