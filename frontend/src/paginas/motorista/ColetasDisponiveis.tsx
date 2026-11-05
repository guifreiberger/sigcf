import { Calendar, Check, Hand, Info, LoaderCircle, MapPin, Megaphone, Weight } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { ApiError } from '../../api/cliente.ts'
import { useAceitarColeta, useCadastro, useColetasDisponiveis } from '../../api/consultas.ts'
import type { Ordem } from '../../api/tipos.ts'
import { Dialogo } from '../../componentes/Dialogo.tsx'
import { MensagemErro } from '../../componentes/Estados.tsx'
import { diaRelativo, formatarData, formatarKg, formatarPlaca, hojeLocal } from '../../util/formatos.ts'

// Coletas publicadas pelo gestor sem motorista: o primeiro que aceitar fica com ela (RF12).
export function ColetasDisponiveis() {
  const idTitulo = useId()
  const disponiveis = useColetasDisponiveis()
  const aceitar = useAceitarColeta()
  const [escolhida, setEscolhida] = useState<Ordem | null>(null)
  const [confirmacao, setConfirmacao] = useState<string | null>(null)

  const coletas = disponiveis.data ?? []
  // O diálogo continua aberto mesmo que a coleta saia da lista, para mostrar quem chegou antes.
  if (!coletas.length && !confirmacao && !escolhida) return null

  function abrir(ordem: Ordem) {
    setConfirmacao(null)
    setEscolhida(ordem)
  }

  function fechar() {
    setEscolhida(null)
    aceitar.reset()
  }

  function confirmar(ordem: Ordem, veiculoId: number) {
    aceitar.mutate(
      { id: ordem.id, veiculoId },
      {
        onSuccess: (aceita) => {
          setEscolhida(null)
          setConfirmacao(
            aceita.dataColeta === hojeLocal()
              ? `Coleta em ${aceita.cliente.nome} aceita. Ela já está na sua lista de hoje.`
              : `Coleta em ${aceita.cliente.nome} aceita para ${formatarData(aceita.dataColeta)}. Ela aparece na sua lista no dia.`,
          )
        },
      },
    )
  }

  return (
    <section className="disponiveis" aria-labelledby={idTitulo}>
      <header className="disponiveis__topo">
        <h2 id={idTitulo}>
          <Megaphone size={18} aria-hidden />
          Coletas disponíveis
        </h2>
        {coletas.length > 0 && <p>O primeiro motorista que aceitar fica com a coleta.</p>}
      </header>

      {confirmacao && (
        <p className="alerta alerta--sucesso" role="status">
          <Check size={18} aria-hidden />
          <span>{confirmacao}</span>
        </p>
      )}

      {coletas.length > 0 && (
        <ul className="coletas">
          {coletas.map((ordem) => (
            <li key={ordem.id}>
              <CartaoDisponivel ordem={ordem} aoAceitar={() => abrir(ordem)} />
            </li>
          ))}
        </ul>
      )}

      <Dialogo aberto={escolhida !== null} titulo="Aceitar coleta" aoFechar={fechar}>
        {escolhida && (
          <FormularioAceite
            ordem={escolhida}
            enviando={aceitar.isPending}
            erro={aceitar.error}
            aoFechar={fechar}
            aoConfirmar={(veiculoId) => confirmar(escolhida, veiculoId)}
          />
        )}
      </Dialogo>
    </section>
  )
}

function CartaoDisponivel({ ordem, aoAceitar }: { ordem: Ordem; aoAceitar: () => void }) {
  return (
    <article className="coleta coleta--disponivel">
      <h3 className="coleta__cliente">{ordem.cliente.nome}</h3>
      <p className="coleta__linha coleta__endereco">
        <MapPin size={17} aria-hidden />
        {ordem.enderecoColeta}
      </p>
      <p className="coleta__meta">
        <span>
          <Calendar size={15} aria-hidden />
          {diaRelativo(ordem.dataColeta)}
        </span>
        {ordem.pesoEstimadoKg != null && (
          <span>
            <Weight size={15} aria-hidden />
            cerca de {formatarKg(ordem.pesoEstimadoKg)}
          </span>
        )}
      </p>
      {ordem.observacao && (
        <p className="coleta__observacao pre-linha">
          <Info size={17} aria-hidden />
          <span>{ordem.observacao}</span>
        </p>
      )}
      <footer className="coleta__acoes">
        <button type="button" className="botao botao--primario botao--grande" onClick={aoAceitar}>
          <Hand size={20} aria-hidden />
          Aceitar coleta
        </button>
      </footer>
    </article>
  )
}

interface PropsFormulario {
  ordem: Ordem
  enviando: boolean
  erro: unknown
  aoConfirmar: (veiculoId: number) => void
  aoFechar: () => void
}

function FormularioAceite({ ordem, enviando, erro, aoConfirmar, aoFechar }: PropsFormulario) {
  const veiculos = useCadastro('veiculos', true)
  const [veiculoId, setVeiculoId] = useState('')
  // Outro motorista aceitou antes (ou o gestor cancelou): não adianta tentar de novo.
  const perdeu = erro instanceof ApiError && erro.status === 409

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (veiculoId) aoConfirmar(Number(veiculoId))
  }

  return (
    <form className="dialogo__corpo" onSubmit={enviar}>
      <p>
        Coleta em <strong>{ordem.cliente.nome}</strong> para {diaRelativo(ordem.dataColeta).toLowerCase()}. Com qual
        veículo você vai?
      </p>
      <label className="campo">
        <span>Veículo</span>
        <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required disabled={perdeu}>
          <option value="">Selecione…</option>
          {veiculos.data?.map((v) => (
            <option key={v.id} value={v.id}>
              {formatarPlaca(v.placa)} — {v.modelo} ({formatarKg(v.capacidadeKg)})
            </option>
          ))}
        </select>
      </label>
      <MensagemErro erro={veiculos.error ?? erro} />
      <footer className="dialogo__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          {perdeu ? 'Entendi' : 'Voltar'}
        </button>
        {!perdeu && (
          <button type="submit" className="botao botao--primario" disabled={enviando}>
            {enviando ? <LoaderCircle size={18} className="girar" aria-hidden /> : <Check size={18} aria-hidden />}
            {enviando ? 'Enviando…' : 'Aceitar coleta'}
          </button>
        )}
      </footer>
    </form>
  )
}
