import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { useEditarOrdem, useOrdem } from '../../api/consultas.ts'
import type { StatusOrdem } from '../../api/tipos.ts'
import { Carregando, MensagemErro } from '../../componentes/Estados.tsx'
import { FormularioOrdem } from './FormularioOrdem.tsx'

const EDITAVEIS: StatusOrdem[] = ['DISPONIVEL', 'AGUARDANDO', 'EM_ANDAMENTO']
const texto = (valor: number | null | undefined) => (valor == null ? '' : String(valor))

// Edição da ordem pelo gestor (RF13). As regras de cada status ficam no backend; a tela
// só antecipa o que ele aceitaria.
export function EditarOrdem() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const ordem = useOrdem(id)
  const editar = useEditarOrdem()

  const voltar = (
    <Link to={`/gestor/ordens/${id}`} className="voltar">
      <ChevronLeft size={16} aria-hidden />
      Ordem #{id}
    </Link>
  )

  if (ordem.isPending) return <Carregando />
  if (!ordem.data) {
    return (
      <>
        {voltar}
        <MensagemErro erro={ordem.error} />
      </>
    )
  }

  const o = ordem.data
  return (
    <>
      <header className="pagina__topo">
        <div>
          {voltar}
          <h1>Editar ordem #{o.id}</h1>
        </div>
      </header>

      {EDITAVEIS.includes(o.status) ? (
        <FormularioOrdem
          inicial={{
            clienteId: String(o.clienteId),
            enderecoColeta: o.enderecoColeta,
            dataColeta: o.dataColeta,
            pesoEstimado: texto(o.pesoEstimadoKg),
            observacao: o.observacao ?? '',
            motoristaId: texto(o.motoristaId),
            veiculoId: texto(o.veiculoId),
            disponibilizar: o.status === 'DISPONIVEL',
          }}
          apenasObservacao={o.status === 'EM_ANDAMENTO'}
          rotuloEnviar={() => 'Salvar alterações'}
          rotuloEnviando="Salvando…"
          enviando={editar.isPending}
          erro={editar.error}
          cancelarPara={`/gestor/ordens/${o.id}`}
          aoEnviar={(dados) =>
            editar.mutate(
              { id: o.id, dados },
              { onSuccess: () => navegar(`/gestor/ordens/${o.id}`, { replace: true }) },
            )
          }
        />
      ) : (
        <p className="alerta alerta--aviso">Coleta finalizada não pode ser editada.</p>
      )}
    </>
  )
}
