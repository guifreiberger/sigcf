import { Check, ChevronLeft, LoaderCircle, Megaphone } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useCadastro, useCriarOrdem } from '../../api/consultas.ts'
import { MensagemErro } from '../../componentes/Estados.tsx'
import { formatarKg, formatarPlaca, hojeLocal } from '../../util/formatos.ts'

export function NovaOrdem() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const clientes = useCadastro('clientes', true)
  const veiculos = useCadastro('veiculos', true)
  const motoristas = useCadastro('motoristas', true)
  const criar = useCriarOrdem()

  const [clienteId, setClienteId] = useState(parametros.get('clienteId') ?? '')
  const [disponibilizar, setDisponibilizar] = useState(false)
  const [veiculoId, setVeiculoId] = useState('')
  const [motoristaId, setMotoristaId] = useState('')
  const [dataColeta, setDataColeta] = useState(parametros.get('data') ?? hojeLocal())
  const [enderecoEditado, setEnderecoEditado] = useState<string | null>(null)
  const [pesoEstimado, setPesoEstimado] = useState('')
  const [observacao, setObservacao] = useState('')

  const enderecoDoCliente = clientes.data?.find((c) => c.id === Number(clienteId))?.endereco ?? ''
  const endereco = enderecoEditado ?? enderecoDoCliente

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    criar.mutate(
      {
        clienteId: Number(clienteId),
        // Sem motorista e veículo, a coleta vai para todos os motoristas (RF12).
        veiculoId: disponibilizar ? undefined : Number(veiculoId),
        motoristaId: disponibilizar ? undefined : Number(motoristaId),
        dataColeta,
        enderecoColeta: endereco.trim() || undefined,
        pesoEstimadoKg: pesoEstimado ? Number(pesoEstimado) : undefined,
        observacao: observacao.trim() || undefined,
      },
      { onSuccess: (ordem) => navegar(`/gestor/ordens/${ordem.id}`, { replace: true }) },
    )
  }

  const semCadastros =
    (clientes.data && !clientes.data.length) ||
    (veiculos.data && !veiculos.data.length) ||
    (motoristas.data && !motoristas.data.length)

  return (
    <>
      <header className="pagina__topo">
        <div>
          <Link to="/gestor/ordens" className="voltar">
            <ChevronLeft size={16} aria-hidden />
            Ordens
          </Link>
          <h1>Nova ordem de coleta</h1>
        </div>
      </header>

      {semCadastros && (
        <p className="alerta alerta--aviso">
          Cadastre ao menos um cliente, um veículo e um motorista ativos antes de criar ordens.
        </p>
      )}

      <form className="cartao formulario" onSubmit={enviar}>
        <label className="campo">
          <span>Cliente</span>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
            <option value="">Selecione…</option>
            {clientes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Endereço da coleta</span>
          <input
            value={endereco}
            onChange={(e) => setEnderecoEditado(e.target.value)}
            maxLength={255}
            placeholder="Preenchido com o endereço do cliente"
          />
        </label>

        <fieldset className="opcoes">
          <legend>Quem faz a coleta</legend>
          <label className="opcao">
            <input type="radio" name="atribuicao" checked={!disponibilizar} onChange={() => setDisponibilizar(false)} />
            <span>
              <strong>Escolher o motorista</strong>
              <small>Você define o motorista e o veículo agora.</small>
            </span>
          </label>
          <label className="opcao">
            <input type="radio" name="atribuicao" checked={disponibilizar} onChange={() => setDisponibilizar(true)} />
            <span>
              <strong>Disponibilizar para os motoristas</strong>
              <small>Todos recebem um aviso; o primeiro que aceitar fica com a coleta e escolhe o veículo.</small>
            </span>
          </label>
        </fieldset>

        <div className="formulario__linha">
          {!disponibilizar && (
            <>
              <label className="campo">
                <span>Motorista</span>
                <select value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {motoristas.data?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="campo">
                <span>Veículo</span>
                <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {veiculos.data?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {formatarPlaca(v.placa)} — {v.modelo} ({formatarKg(v.capacidadeKg)})
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="campo">
            <span>Data da coleta</span>
            <input
              type="date"
              value={dataColeta}
              min={hojeLocal()}
              onChange={(e) => setDataColeta(e.target.value)}
              required
            />
          </label>

          <label className="campo">
            <span>
              Peso estimado (kg) <small className="texto-suave">(opcional)</small>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              value={pesoEstimado}
              onChange={(e) => setPesoEstimado(e.target.value)}
              placeholder="Informado pelo cliente"
            />
          </label>
        </div>

        <label className="campo">
          <span>Observações para o motorista (opcional)</span>
          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={2000} />
        </label>

        <MensagemErro erro={criar.error} />

        <footer className="formulario__acoes">
          <Link to="/gestor/ordens" className="botao botao--secundario">
            Cancelar
          </Link>
          <button type="submit" className="botao botao--primario" disabled={criar.isPending}>
            {criar.isPending ? (
              <LoaderCircle size={18} className="girar" aria-hidden />
            ) : disponibilizar ? (
              <Megaphone size={18} aria-hidden />
            ) : (
              <Check size={18} aria-hidden />
            )}
            {criar.isPending ? 'Criando…' : disponibilizar ? 'Publicar para os motoristas' : 'Criar ordem'}
          </button>
        </footer>
      </form>
    </>
  )
}
