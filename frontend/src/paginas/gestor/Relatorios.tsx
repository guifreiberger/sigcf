import { Download, LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useCadastro, useRelatorioDeColetas } from '../../api/consultas.ts'
import type { StatusOrdem } from '../../api/tipos.ts'
import { MensagemErro } from '../../componentes/Estados.tsx'
import { hojeLocal, ORDEM_STATUS, ROTULO_STATUS } from '../../util/formatos.ts'
import { periodoPredefinido } from '../../util/periodos.ts'
import { baixarArquivo, nomeDaPlanilha, planilhaDeColetas } from '../../util/planilha.ts'

const paraId = (valor: string) => (valor ? Number(valor) : undefined)

// Relatório das coletas por período, em planilha para o Excel (RF15).
export function Relatorios() {
  // Motoristas e clientes inativos também aparecem: o relatório pode olhar para trás.
  const motoristas = useCadastro('motoristas')
  const clientes = useCadastro('clientes')
  const relatorio = useRelatorioDeColetas()

  const [periodo, setPeriodo] = useState(() => periodoPredefinido('mes', hojeLocal()))
  const [motoristaId, setMotoristaId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [status, setStatus] = useState<StatusOrdem | ''>('')
  const [resultado, setResultado] = useState<{ texto: string; baixou: boolean } | null>(null)

  function baixar(evento: FormEvent) {
    evento.preventDefault()
    setResultado(null)
    relatorio.mutate(
      {
        ...periodo,
        motoristaId: paraId(motoristaId),
        clienteId: paraId(clienteId),
        status: status || undefined,
      },
      {
        onSuccess: (linhas) => {
          if (!linhas.length) {
            setResultado({ texto: 'Nenhuma coleta encontrada com esses filtros.', baixou: false })
            return
          }
          baixarArquivo(planilhaDeColetas(linhas), nomeDaPlanilha(periodo.de, periodo.ate))
          const quantidade = `${linhas.length} ${linhas.length === 1 ? 'coleta' : 'coletas'}`
          setResultado({ texto: `Planilha baixada com ${quantidade}.`, baixou: true })
        },
      },
    )
  }

  return (
    <>
      <header className="pagina__topo">
        <div>
          <h1>Relatórios</h1>
          <p className="texto-suave">
            Planilha das coletas do período, com peso da balança, distância, tempo, status, motorista e caminhão.
          </p>
        </div>
      </header>

      <form className="cartao formulario" onSubmit={baixar}>
        <div className="formulario__linha">
          <label className="campo">
            <span>De</span>
            <input
              type="date"
              required
              value={periodo.de}
              max={periodo.ate}
              onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
            />
          </label>
          <label className="campo">
            <span>Até</span>
            <input
              type="date"
              required
              value={periodo.ate}
              min={periodo.de}
              onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
            />
          </label>
          <label className="campo">
            <span>Motorista</span>
            <select value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}>
              <option value="">Todos</option>
              {motoristas.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Cliente</span>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Todos</option>
              {clientes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusOrdem | '')}>
              <option value="">Todos</option>
              {ORDEM_STATUS.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <MensagemErro erro={relatorio.error} />
        {resultado && (
          <p className={`alerta ${resultado.baixou ? 'alerta--sucesso' : 'alerta--aviso'}`} role="status">
            {resultado.texto}
          </p>
        )}

        <footer className="formulario__acoes">
          <button type="submit" className="botao botao--primario" disabled={relatorio.isPending}>
            {relatorio.isPending ? (
              <LoaderCircle size={18} className="girar" aria-hidden />
            ) : (
              <Download size={18} aria-hidden />
            )}
            {relatorio.isPending ? 'Gerando…' : 'Baixar planilha'}
          </button>
        </footer>
      </form>

      <p className="texto-suave nota-metodo">
        A planilha abre no Excel e traz, para cada coleta: data, cliente, endereço, motorista, caminhão, status, peso
        estimado, peso da balança, distância percorrida, tempo da coleta, horários de início e fim e o motivo de falha
        ou cancelamento. O período pode ter até um ano.
      </p>
    </>
  )
}
