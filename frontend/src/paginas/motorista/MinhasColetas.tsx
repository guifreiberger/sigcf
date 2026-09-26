import { useState } from 'react'
import { useAlterarStatus, useMinhasColetas } from '../../api/consultas.ts'
import type { Ordem, StatusOrdem } from '../../api/tipos.ts'
import { useAuth } from '../../auth/useAuth.ts'
import { Dialogo } from '../../componentes/Dialogo.tsx'
import { DialogoMotivo } from '../../componentes/DialogoMotivo.tsx'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import { StatusBadge } from '../../componentes/StatusBadge.tsx'
import {
  formatarDataExtenso,
  formatarPlaca,
  formatarTelefone,
  hojeLocal,
  linkMapa,
} from '../../util/formatos.ts'

const PRIORIDADE: Record<StatusOrdem, number> = {
  EM_ANDAMENTO: 0,
  AGUARDANDO: 1,
  FALHA: 2,
  CONCLUIDA: 3,
  CANCELADA: 4,
}

const MOTIVOS_FALHA = [
  'Cliente ausente',
  'Endereço não localizado',
  'Carga recusada pelo cliente',
  'Problema no veículo',
]

type Acao = { ordem: Ordem; status: 'CONCLUIDA' | 'FALHA' } | null

export function MinhasColetas() {
  const { usuario, sair } = useAuth()
  const hoje = hojeLocal()
  const coletas = useMinhasColetas(hoje)
  const alterar = useAlterarStatus()
  const [acao, setAcao] = useState<Acao>(null)

  const ordenadas = [...(coletas.data ?? [])].sort(
    (a, b) => PRIORIDADE[a.status] - PRIORIDADE[b.status] || a.id - b.id,
  )
  const pendentes = ordenadas.filter((o) => o.status === 'AGUARDANDO' || o.status === 'EM_ANDAMENTO').length

  function fecharAcao() {
    setAcao(null)
    alterar.reset()
  }

  function executar(ordem: Ordem, status: StatusOrdem, motivo?: string) {
    alterar.mutate({ id: ordem.id, status, motivo }, { onSuccess: () => setAcao(null) })
  }

  return (
    <div className="motorista">
      <header className="motorista__topo">
        <div>
          <small>Olá,</small>
          <strong>{usuario?.nome.split(' ')[0]}</strong>
        </div>
        <button type="button" className="botao botao--fantasma-claro" onClick={sair}>
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
            className="botao botao--secundario botao--pequeno"
            onClick={() => coletas.refetch()}
            disabled={coletas.isFetching}
          >
            {coletas.isFetching ? 'Atualizando…' : 'Atualizar'}
          </button>
        </section>

        <MensagemErro erro={coletas.error} />
        {!acao && <MensagemErro erro={alterar.error} />}

        {coletas.isPending ? (
          <Carregando texto="Buscando suas coletas…" />
        ) : ordenadas.length === 0 ? (
          <Vazio>Nenhuma coleta atribuída a você hoje. Se isso parecer errado, fale com o gestor.</Vazio>
        ) : (
          <ul className="coletas">
            {ordenadas.map((ordem) => (
              <li key={ordem.id}>
                <CartaoColeta
                  ordem={ordem}
                  ocupado={alterar.isPending && alterar.variables?.id === ordem.id}
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
                disabled={alterar.isPending}
                onClick={() => executar(acao.ordem, 'CONCLUIDA')}
              >
                {alterar.isPending ? 'Enviando…' : 'Confirmar conclusão'}
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
        enviando={alterar.isPending}
        erro={alterar.error}
        aoFechar={fecharAcao}
        aoConfirmar={(motivo) => acao && executar(acao.ordem, 'FALHA', motivo)}
      />
    </div>
  )
}

interface PropsCartao {
  ordem: Ordem
  ocupado: boolean
  aoIniciar: () => void
  aoConcluir: () => void
  aoFalhar: () => void
}

function CartaoColeta({ ordem, ocupado, aoIniciar, aoConcluir, aoFalhar }: PropsCartao) {
  const pode = (status: StatusOrdem) => ordem.transicoesPermitidas.includes(status)
  const finalizada = ordem.transicoesPermitidas.length === 0

  return (
    <article className={`coleta coleta--${ordem.status.toLowerCase()}`}>
      <header className="coleta__topo">
        <StatusBadge status={ordem.status} />
        <small className="texto-suave">#{ordem.id}</small>
      </header>

      <h2 className="coleta__cliente">{ordem.cliente.nome}</h2>
      <p className="coleta__endereco">{ordem.enderecoColeta}</p>

      <div className="coleta__atalhos">
        <a className="botao botao--secundario" href={linkMapa(ordem.enderecoColeta)} target="_blank" rel="noreferrer">
          Abrir no mapa
        </a>
        {ordem.cliente.telefone && (
          <a className="botao botao--secundario" href={`tel:${ordem.cliente.telefone}`}>
            Ligar {formatarTelefone(ordem.cliente.telefone)}
          </a>
        )}
      </div>

      <p className="coleta__veiculo texto-suave">
        Veículo {formatarPlaca(ordem.veiculo.placa)} · {ordem.veiculo.modelo}
      </p>
      {ordem.observacao && <p className="coleta__observacao pre-linha">{ordem.observacao}</p>}

      {!finalizada && (
        <footer className="coleta__acoes">
          {pode('EM_ANDAMENTO') && (
            <button type="button" className="botao botao--primario botao--grande" onClick={aoIniciar} disabled={ocupado}>
              {ocupado ? 'Enviando…' : 'Iniciar coleta'}
            </button>
          )}
          {pode('CONCLUIDA') && (
            <button type="button" className="botao botao--sucesso botao--grande" onClick={aoConcluir} disabled={ocupado}>
              Concluir coleta
            </button>
          )}
          {pode('FALHA') && (
            <button type="button" className="botao botao--perigo-contorno botao--grande" onClick={aoFalhar} disabled={ocupado}>
              Reportar falha
            </button>
          )}
        </footer>
      )}
    </article>
  )
}
