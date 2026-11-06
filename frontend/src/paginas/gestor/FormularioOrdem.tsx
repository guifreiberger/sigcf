import { Check, LoaderCircle, Megaphone } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { useCadastro } from '../../api/consultas.ts'
import { MensagemErro } from '../../componentes/Estados.tsx'
import { formatarKg, formatarPlaca, hojeLocal } from '../../util/formatos.ts'

export interface DadosOrdem {
  clienteId: number
  enderecoColeta: string
  dataColeta: string
  pesoEstimadoKg: number | null
  observacao: string | null
  // Nulos quando a coleta é disponibilizada para os motoristas (RF12).
  motoristaId: number | null
  veiculoId: number | null
}

export interface ValoresIniciais {
  clienteId?: string
  enderecoColeta?: string
  dataColeta?: string
  pesoEstimado?: string
  observacao?: string
  motoristaId?: string
  veiculoId?: string
  disponibilizar?: boolean
}

interface Props {
  inicial?: ValoresIniciais
  // Coleta em andamento: só as observações podem mudar (RF13).
  apenasObservacao?: boolean
  rotuloEnviar: (disponibilizar: boolean) => string
  rotuloEnviando: string
  enviando: boolean
  erro: unknown
  cancelarPara: string
  aoEnviar: (dados: DadosOrdem) => void
}

// Formulário da ordem de coleta, usado na criação e na edição.
export function FormularioOrdem({
  inicial = {},
  apenasObservacao = false,
  rotuloEnviar,
  rotuloEnviando,
  enviando,
  erro,
  cancelarPara,
  aoEnviar,
}: Props) {
  const clientes = useCadastro('clientes', true)
  const veiculos = useCadastro('veiculos', true)
  const motoristas = useCadastro('motoristas', true)

  const [clienteId, setClienteId] = useState(inicial.clienteId ?? '')
  const [disponibilizar, setDisponibilizar] = useState(inicial.disponibilizar ?? false)
  const [motoristaId, setMotoristaId] = useState(inicial.motoristaId ?? '')
  const [veiculoId, setVeiculoId] = useState(inicial.veiculoId ?? '')
  const [dataColeta, setDataColeta] = useState(inicial.dataColeta ?? hojeLocal())
  const [enderecoEditado, setEnderecoEditado] = useState<string | null>(inicial.enderecoColeta ?? null)
  const [pesoEstimado, setPesoEstimado] = useState(inicial.pesoEstimado ?? '')
  const [observacao, setObservacao] = useState(inicial.observacao ?? '')

  const enderecoDoCliente = clientes.data?.find((c) => c.id === Number(clienteId))?.endereco ?? ''
  const endereco = enderecoEditado ?? enderecoDoCliente
  const motorista = motoristas.data?.find((m) => m.id === Number(motoristaId))
  const usandoCaminhaoPadrao = motorista?.veiculoPadraoId != null && motorista.veiculoPadraoId === Number(veiculoId)

  function escolherCliente(valor: string) {
    setClienteId(valor)
    // Outro cliente, outro endereço: volta a sugerir o endereço cadastrado dele.
    setEnderecoEditado(null)
  }

  // O caminhão padrão do motorista vem preenchido, mas pode ser trocado (RF14).
  function escolherMotorista(valor: string) {
    setMotoristaId(valor)
    const padrao = motoristas.data?.find((m) => m.id === Number(valor))?.veiculoPadraoId
    if (padrao != null && veiculos.data?.some((v) => v.id === padrao)) setVeiculoId(String(padrao))
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    aoEnviar({
      clienteId: Number(clienteId),
      enderecoColeta: endereco.trim(),
      dataColeta,
      pesoEstimadoKg: pesoEstimado ? Number(pesoEstimado) : null,
      observacao: observacao.trim() || null,
      motoristaId: disponibilizar ? null : Number(motoristaId),
      veiculoId: disponibilizar ? null : Number(veiculoId),
    })
  }

  return (
    <form className="cartao formulario" onSubmit={enviar}>
      {apenasObservacao && (
        <p className="alerta alerta--aviso">Com a coleta em andamento, só as observações podem ser alteradas.</p>
      )}

      <fieldset className="formulario__grupo" disabled={apenasObservacao}>
        <label className="campo">
          <span>Cliente</span>
          <select value={clienteId} onChange={(e) => escolherCliente(e.target.value)} required>
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
                <select value={motoristaId} onChange={(e) => escolherMotorista(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {motoristas.data?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </label>

              <div className="campo-com-dica">
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
                {usandoCaminhaoPadrao && <small className="texto-suave">Caminhão padrão de {motorista.nome}</small>}
              </div>
            </>
          )}

          <label className="campo">
            <span>Data da coleta</span>
            <input
              type="date"
              value={dataColeta}
              // Uma coleta atrasada pode ser editada sem mudar a data; só a data nova não pode ser passada.
              min={dataColeta === inicial.dataColeta ? undefined : hojeLocal()}
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
      </fieldset>

      <label className="campo">
        <span>Observações para o motorista (opcional)</span>
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={2000} />
      </label>

      <MensagemErro erro={erro} />

      <footer className="formulario__acoes">
        <Link to={cancelarPara} className="botao botao--secundario">
          Cancelar
        </Link>
        <button type="submit" className="botao botao--primario" disabled={enviando}>
          {enviando ? (
            <LoaderCircle size={18} className="girar" aria-hidden />
          ) : disponibilizar ? (
            <Megaphone size={18} aria-hidden />
          ) : (
            <Check size={18} aria-hidden />
          )}
          {enviando ? rotuloEnviando : rotuloEnviar(disponibilizar)}
        </button>
      </footer>
    </form>
  )
}
