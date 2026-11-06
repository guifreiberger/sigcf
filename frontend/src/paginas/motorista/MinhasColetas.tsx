import {
  Calendar,
  Check,
  Info,
  LoaderCircle,
  LocateFixed,
  LocateOff,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  Play,
  RefreshCw,
  Settings,
  TriangleAlert,
  Truck,
  Weight,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAlterarStatus, useMinhasColetas } from '../../api/consultas.ts'
import type { Ordem, StatusOrdem } from '../../api/tipos.ts'
import { useAuth } from '../../auth/useAuth.ts'
import { Dialogo } from '../../componentes/Dialogo.tsx'
import { DialogoMotivo } from '../../componentes/DialogoMotivo.tsx'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import { StatusBadge } from '../../componentes/StatusBadge.tsx'
import {
  formatarDataExtenso,
  formatarKg,
  formatarPlaca,
  formatarTelefone,
  hojeLocal,
  iniciais,
  linkMapa,
} from '../../util/formatos.ts'
import { abrirConfiguracoesDoApp } from '../../nativo/rastreamento.ts'
import { ehAppNativo } from '../../nativo/plataforma.ts'
import { localizacaoBloqueada, obterLocalizacao } from '../../util/localizacao.ts'
import { AvisosColetas } from './AvisosColetas.tsx'
import { ColetasDisponiveis } from './ColetasDisponiveis.tsx'
import { type EstadoRastreamento, useRastreamento } from './useRastreamento.ts'

const PRIORIDADE: Record<StatusOrdem, number> = {
  EM_ANDAMENTO: 0,
  AGUARDANDO: 1,
  DISPONIVEL: 2,
  FALHA: 3,
  CONCLUIDA: 4,
  CANCELADA: 5,
}

const MOTIVOS_FALHA = [
  'Cliente ausente',
  'Endereço não localizado',
  'Carga recusada pelo cliente',
  'Problema no veículo',
]

type Acao = { ordem: Ordem; status: 'CONCLUIDA' | 'FALHA' } | null

function saudacao() {
  const hora = new Date().getHours()
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
}

export function MinhasColetas() {
  const { usuario, sair } = useAuth()
  const hoje = hojeLocal()
  const coletas = useMinhasColetas(hoje)
  const alterar = useAlterarStatus()
  // Se o gestor cancelar a coleta, o servidor recusa as posições; a lista é atualizada e o
  // rastreamento para, mesmo com o app em segundo plano.
  const rastreamento = useRastreamento(coletas.data?.some((o) => o.status === 'EM_ANDAMENTO') ?? false, () => {
    void coletas.refetch()
  })
  const [acao, setAcao] = useState<Acao>(null)
  const [localizando, setLocalizando] = useState<number | null>(null)
  const [semPermissao, setSemPermissao] = useState(false)

  useEffect(() => {
    void localizacaoBloqueada().then(setSemPermissao)
  }, [])

  const enviando = localizando !== null || alterar.isPending
  const rotuloEnvio = localizando !== null ? 'Obtendo localização…' : 'Enviando…'

  const ordenadas = [...(coletas.data ?? [])].sort(
    (a, b) => PRIORIDADE[a.status] - PRIORIDADE[b.status] || a.id - b.id,
  )
  const pendentes = ordenadas.filter((o) => o.status === 'AGUARDANDO' || o.status === 'EM_ANDAMENTO').length
  const progresso = ordenadas.length ? Math.round(((ordenadas.length - pendentes) / ordenadas.length) * 100) : 0

  function fecharAcao() {
    setAcao(null)
    alterar.reset()
  }

  async function executar(ordem: Ordem, status: StatusOrdem, motivo?: string) {
    setLocalizando(ordem.id)
    const localizacao = await obterLocalizacao()
    // Depois de finalizar, o servidor recusa pontos; então o que estiver na fila vai antes.
    if (status !== 'EM_ANDAMENTO') await rastreamento.enviarPendentes()
    setLocalizando(null)
    if (!localizacao) void localizacaoBloqueada().then(setSemPermissao)
    alterar.mutate(
      { id: ordem.id, status, motivo, localizacao: localizacao ?? undefined },
      { onSuccess: () => setAcao(null) },
    )
  }

  return (
    <div className="motorista">
      <header className="motorista__topo">
        <div className="motorista__saudacao">
          <span className="avatar" aria-hidden>
            {iniciais(usuario?.nome ?? '')}
          </span>
          <div>
            <small>{saudacao()},</small>
            <strong>{usuario?.nome.split(' ')[0]}</strong>
          </div>
        </div>
        <button type="button" className="botao botao--fantasma-claro botao--pequeno" onClick={sair}>
          <LogOut size={16} aria-hidden />
          Sair
        </button>
      </header>

      <main className="motorista__conteudo">
        <section className="motorista__dia">
          <h1 className="primeira-maiuscula">{formatarDataExtenso(hoje)}</h1>
          {coletas.data && (
            <p>
              {coletas.data.length === 0
                ? 'Sem coletas hoje'
                : `${pendentes} de ${coletas.data.length} ${coletas.data.length === 1 ? 'coleta pendente' : 'coletas pendentes'}`}
            </p>
          )}
          <button
            type="button"
            className="botao-icone"
            onClick={() => coletas.refetch()}
            disabled={coletas.isFetching}
            aria-label="Atualizar coletas"
            title="Atualizar coletas"
          >
            <RefreshCw size={20} className={coletas.isFetching ? 'girar' : undefined} aria-hidden />
          </button>
          {ordenadas.length > 0 && (
            <div
              className="progresso"
              role="progressbar"
              aria-label="Coletas finalizadas"
              aria-valuenow={progresso}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progresso__barra" style={{ width: `${progresso}%` }} />
            </div>
          )}
          <p className="motorista__aviso">
            <MapPin size={14} aria-hidden />
            {semPermissao
              ? 'A localização está bloqueada no navegador. As coletas funcionam normalmente, mas sem o registro do local.'
              : 'Sua localização é compartilhada com o gestor somente enquanto uma coleta estiver em andamento.'}
          </p>
        </section>

        <Compartilhamento estado={rastreamento.estado} pendentes={rastreamento.pendentes} />
        <AvisosColetas />
        <ColetasDisponiveis />

        <MensagemErro erro={coletas.error} />
        {!acao && <MensagemErro erro={alterar.error} />}

        {coletas.isPending ? (
          <Carregando texto="Buscando suas coletas…" />
        ) : ordenadas.length === 0 ? (
          <Vazio icone={Calendar}>Nenhuma coleta atribuída a você hoje. Se isso parecer errado, fale com o gestor.</Vazio>
        ) : (
          <ul className="coletas">
            {ordenadas.map((ordem) => (
              <li key={ordem.id}>
                <CartaoColeta
                  ordem={ordem}
                  ocupado={localizando === ordem.id || (alterar.isPending && alterar.variables?.id === ordem.id)}
                  rotuloOcupado={rotuloEnvio}
                  aoIniciar={() => executar(ordem, 'EM_ANDAMENTO')}
                  aoConcluir={() => setAcao({ ordem, status: 'CONCLUIDA' })}
                  aoFalhar={() => setAcao({ ordem, status: 'FALHA' })}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialogo aberto={acao?.status === 'CONCLUIDA'} titulo="Concluir coleta" aoFechar={fecharAcao}>
        {acao?.status === 'CONCLUIDA' && (
          <div className="dialogo__corpo">
            <p>
              Confirma a conclusão da coleta em <strong>{acao.ordem.cliente.nome}</strong>? Essa ação não pode ser
              desfeita.
            </p>
            <MensagemErro erro={alterar.error} />
            <footer className="dialogo__acoes">
              <button type="button" className="botao botao--secundario" onClick={fecharAcao}>
                Voltar
              </button>
              <button
                type="button"
                className="botao botao--sucesso"
                disabled={enviando}
                onClick={() => executar(acao.ordem, 'CONCLUIDA')}
              >
                {enviando ? rotuloEnvio : 'Confirmar conclusão'}
              </button>
            </footer>
          </div>
        )}
      </Dialogo>

      <DialogoMotivo
        aberto={acao?.status === 'FALHA'}
        titulo="Reportar falha"
        descricao={`O que impediu a coleta em ${acao?.ordem.cliente.nome ?? ''}? O gestor verá este motivo.`}
        rotuloConfirmar="Reportar falha"
        sugestoes={MOTIVOS_FALHA}
        enviando={enviando}
        erro={alterar.error}
        aoFechar={fecharAcao}
        aoConfirmar={(motivo) => acao && executar(acao.ordem, 'FALHA', motivo)}
      />
    </div>
  )
}

function Compartilhamento({ estado, pendentes }: { estado: EstadoRastreamento; pendentes: number }) {
  if (estado === 'desligado') return null
  const semGps = estado === 'sem-gps'
  const Icone = semGps ? LocateOff : LocateFixed
  const noApp = ehAppNativo()
  const orientacao = semGps
    ? noApp
      ? 'Libere a localização do SIGCF nas configurações do celular para o gestor acompanhar a coleta.'
      : 'Libere a localização do navegador para o gestor acompanhar a coleta.'
    : noApp
      ? 'Pode usar o celular normalmente: a localização continua sendo enviada até você concluir a coleta.'
      : 'A tela fica ligada até você concluir ou reportar falha na coleta.'

  return (
    <section className={`rastreio ${semGps ? 'rastreio--alerta' : ''}`} role="status">
      <span className="rastreio__icone">
        <Icone size={18} aria-hidden />
      </span>
      <p>
        <strong>
          {semGps
            ? 'Não foi possível acessar o GPS'
            : estado === 'aguardando-gps'
              ? 'Procurando o sinal do GPS…'
              : 'Compartilhando sua localização com o gestor'}
        </strong>
        {orientacao}
        {pendentes > 0 && (
          <small>
            {pendentes === 1 ? '1 posição aguardando' : `${pendentes} posições aguardando`} conexão para envio
          </small>
        )}
      </p>
      {semGps && noApp && (
        <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => void abrirConfiguracoesDoApp()}>
          <Settings size={16} aria-hidden />
          Abrir configurações
        </button>
      )}
    </section>
  )
}

interface PropsCartao {
  ordem: Ordem
  ocupado: boolean
  rotuloOcupado: string
  aoIniciar: () => void
  aoConcluir: () => void
  aoFalhar: () => void
}

function CartaoColeta({ ordem, ocupado, rotuloOcupado, aoIniciar, aoConcluir, aoFalhar }: PropsCartao) {
  const pode = (status: StatusOrdem) => ordem.transicoesPermitidas.includes(status)
  const finalizada = ordem.transicoesPermitidas.length === 0

  return (
    <article className={`coleta coleta--${ordem.status.toLowerCase()}`}>
      <header className="coleta__topo">
        <StatusBadge status={ordem.status} />
        <small className="texto-suave">#{ordem.id}</small>
      </header>

      <h2 className="coleta__cliente">{ordem.cliente.nome}</h2>
      <p className="coleta__linha coleta__endereco">
        <MapPin size={17} aria-hidden />
        {ordem.enderecoColeta}
      </p>

      <div className="coleta__atalhos">
        <a className="botao botao--secundario" href={linkMapa(ordem.enderecoColeta)} target="_blank" rel="noreferrer">
          <Navigation size={16} aria-hidden />
          Abrir no mapa
        </a>
        {ordem.cliente.telefone && (
          <a className="botao botao--secundario" href={`tel:${ordem.cliente.telefone}`}>
            <Phone size={16} aria-hidden />
            {formatarTelefone(ordem.cliente.telefone)}
          </a>
        )}
      </div>

      <p className="coleta__meta">
        {ordem.veiculo && (
          <span>
            <Truck size={15} aria-hidden />
            {formatarPlaca(ordem.veiculo.placa)} · {ordem.veiculo.modelo}
          </span>
        )}
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

      {!finalizada && (
        <footer className="coleta__acoes">
          {pode('EM_ANDAMENTO') && (
            <button type="button" className="botao botao--primario botao--grande" onClick={aoIniciar} disabled={ocupado}>
              {ocupado ? (
                <LoaderCircle size={20} className="girar" aria-hidden />
              ) : (
                <Play size={20} aria-hidden />
              )}
              {ocupado ? rotuloOcupado : 'Iniciar coleta'}
            </button>
          )}
          {pode('CONCLUIDA') && (
            <button type="button" className="botao botao--sucesso botao--grande" onClick={aoConcluir} disabled={ocupado}>
              <Check size={20} aria-hidden />
              Concluir coleta
            </button>
          )}
          {pode('FALHA') && (
            <button type="button" className="botao botao--perigo-contorno botao--grande" onClick={aoFalhar} disabled={ocupado}>
              <TriangleAlert size={20} aria-hidden />
              Reportar falha
            </button>
          )}
        </footer>
      )}
    </article>
  )
}
