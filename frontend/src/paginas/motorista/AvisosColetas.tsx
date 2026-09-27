import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { MensagemErro } from '../../componentes/Estados.tsx'
import {
  ativarAvisos,
  desativarAvisos,
  type EstadoAvisos,
  estadoAvisos,
  precisaInstalarNoIphone,
} from '../../util/notificacoes.ts'

export function AvisosColetas() {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoAvisos | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)

  useEffect(() => {
    estadoAvisos().then(setEstado)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const aoReceber = (evento: MessageEvent) => {
      if (evento.data?.tipo === 'sigcf:atualizar') {
        queryClient.invalidateQueries({ queryKey: ['minhas'] })
      }
    }
    navigator.serviceWorker.addEventListener('message', aoReceber)
    return () => navigator.serviceWorker.removeEventListener('message', aoReceber)
  }, [queryClient])

  async function executar(acao: () => Promise<EstadoAvisos | void>, depois?: EstadoAvisos) {
    setErro(null)
    setProcessando(true)
    try {
      setEstado((await acao()) ?? depois ?? null)
    } catch (e) {
      setErro(e)
    } finally {
      setProcessando(false)
    }
  }

  if (estado === 'indisponivel') {
    return precisaInstalarNoIphone() ? (
      <section className="avisos">
        <p>
          Para receber aviso de coleta nova no iPhone, toque em <strong>Compartilhar</strong> e depois em{' '}
          <strong>Adicionar à Tela de Início</strong>. Abra o SIGCF pelo ícone e ative os avisos.
        </p>
      </section>
    ) : null
  }

  if (estado === 'bloqueado') {
    return (
      <section className="avisos">
        <p>Os avisos estão bloqueados. Libere as notificações do SIGCF nas configurações do navegador.</p>
      </section>
    )
  }

  if (estado === 'ativo') {
    return (
      <section className="avisos avisos--ativo">
        <p>Avisos de coleta nova ativados neste celular.</p>
        <button
          type="button"
          className="botao botao--fantasma botao--pequeno"
          disabled={processando}
          onClick={() => executar(desativarAvisos, 'inativo')}
        >
          Desativar
        </button>
        <MensagemErro erro={erro} />
      </section>
    )
  }

  if (estado === 'inativo') {
    return (
      <section className="avisos">
        <p>Receba um aviso no celular, mesmo com o app fechado, quando chegar uma coleta nova para você.</p>
        <button
          type="button"
          className="botao botao--primario"
          disabled={processando}
          onClick={() => executar(ativarAvisos)}
        >
          {processando ? 'Ativando…' : 'Ativar avisos'}
        </button>
        <MensagemErro erro={erro} />
      </section>
    )
  }

  return null
}
