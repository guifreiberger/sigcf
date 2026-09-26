import { type FormEvent, useState } from 'react'
import { Dialogo } from './Dialogo.tsx'
import { MensagemErro } from './Estados.tsx'

interface Props {
  aberto: boolean
  titulo: string
  descricao: string
  rotuloConfirmar: string
  sugestoes?: string[]
  enviando: boolean
  erro: unknown
  aoConfirmar: (motivo: string) => void
  aoFechar: () => void
}

export function DialogoMotivo(props: Props) {
  return (
    <Dialogo aberto={props.aberto} titulo={props.titulo} aoFechar={props.aoFechar}>
      <FormularioMotivo {...props} />
    </Dialogo>
  )
}

function FormularioMotivo({
  descricao,
  rotuloConfirmar,
  sugestoes = [],
  enviando,
  erro,
  aoConfirmar,
  aoFechar,
}: Props) {
  const [motivo, setMotivo] = useState('')

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (motivo.trim()) aoConfirmar(motivo.trim())
  }

  return (
    <form className="dialogo__corpo" onSubmit={enviar}>
      <p className="texto-suave">{descricao}</p>
      {sugestoes.length > 0 && (
        <div className="chips" role="group" aria-label="Motivos frequentes">
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${motivo === s ? 'chip--ativo' : ''}`}
              onClick={() => setMotivo(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <label className="campo">
        <span>Motivo</span>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={255}
          rows={3}
          required
          autoFocus
        />
      </label>
      <MensagemErro erro={erro} />
      <footer className="dialogo__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Voltar
        </button>
        <button type="submit" className="botao botao--perigo" disabled={enviando || !motivo.trim()}>
          {enviando ? 'Enviando…' : rotuloConfirmar}
        </button>
      </footer>
    </form>
  )
}
