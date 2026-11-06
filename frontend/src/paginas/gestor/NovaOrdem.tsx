import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useCadastro, useCriarOrdem } from '../../api/consultas.ts'
import { hojeLocal } from '../../util/formatos.ts'
import { FormularioOrdem } from './FormularioOrdem.tsx'

export function NovaOrdem() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const clientes = useCadastro('clientes', true)
  const veiculos = useCadastro('veiculos', true)
  const motoristas = useCadastro('motoristas', true)
  const criar = useCriarOrdem()

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

      <FormularioOrdem
        // Vindo de um alerta da inteligência, a ordem já chega com o cliente e a data.
        inicial={{ clienteId: parametros.get('clienteId') ?? '', dataColeta: parametros.get('data') ?? hojeLocal() }}
        rotuloEnviar={(disponibilizar) => (disponibilizar ? 'Publicar para os motoristas' : 'Criar ordem')}
        rotuloEnviando="Criando…"
        enviando={criar.isPending}
        erro={criar.error}
        cancelarPara="/gestor/ordens"
        aoEnviar={(dados) =>
          criar.mutate(
            {
              ...dados,
              enderecoColeta: dados.enderecoColeta || undefined,
              pesoEstimadoKg: dados.pesoEstimadoKg ?? undefined,
              observacao: dados.observacao ?? undefined,
              motoristaId: dados.motoristaId ?? undefined,
              veiculoId: dados.veiculoId ?? undefined,
            },
            { onSuccess: (ordem) => navegar(`/gestor/ordens/${ordem.id}`, { replace: true }) },
          )
        }
      />
    </>
  )
}
