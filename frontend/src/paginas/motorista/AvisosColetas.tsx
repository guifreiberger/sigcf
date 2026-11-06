import { useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, BellRing, LoaderCircle, Settings, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MensagemErro } from '../../componentes/Estados.tsx'
import { ativarAvisosNoApp, type EstadoAvisosNoApp } from '../../nativo/avisosNoApp.ts'
import { abrirConfiguracoesDoApp } from '../../nativo/gpsEmSegundoPlano.ts'
import { ehAppNativo } from '../../nativo/plataforma.ts'
import {
  ativarAvisos,
  desativarAvisos,
  type EstadoAvisos,
  estadoAvisos,
  precisaInstalarNoIphone,
} from '../../util/notificacoes.ts'

export function AvisosColetas() {
  return ehAppNativo() ? <AvisosNoApp /> : <AvisosNoNavegador />
}

// No app Android os avisos vêm pelo Firebase e são ativados sozinhos ao abrir: o Android
// mostra o pedido de permissão do próprio sistema.
function AvisosNoApp() {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoAvisosNoApp | 'indisponivel' | null>(null)

  useEffect(() => {
    const atualizar = () => {
      for (const chave of ['minhas', 'disponiveis']) queryClient.invalidateQueries({ queryKey: [chave] })
    }
    ativarAvisosNoApp(atualizar).then(setEstado, () => setEstado('indisponivel'))
  }, [queryClient])

  if (estado === 'negado') {
    return (
      <section className="avisos">
        <span className="avisos__icone">
          <BellOff size={20} aria-hidden />
        </span>
        <p>Os avisos de coleta estão bloqueados. Libere as notificações do SIGCF nas configurações do celular.</p>
        <button type="button" className="botao botao--secundario" onClick={() => void abrirConfiguracoesDoApp()}>
          <Settings size={18} aria-hidden />
          Abrir configurações
        </button>
      </section>
    )
  }

  if (estado === 'ativo') {
    return (
      <section className="avisos avisos--ativo">
        <span className="avisos__icone">
          <BellRing size={16} aria-hidden />
        </span>
        <p>Avisos de coleta ativados neste celular.</p>
      </section>
    )
  }

  return null
}

function AvisosNoNavegador() {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoAvisos | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)

  useEffect(() => {
    // Se o navegador falhar ao consultar o service worker, trata como sem suporte a avisos.
    estadoAvisos().then(setEstado, () => setEstado('indisponivel'))
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const aoReceber = (evento: MessageEvent) => {
      if (evento.data?.tipo === 'sigcf:atualizar') {
        for (const chave of ['minhas', 'disponiveis']) queryClient.invalidateQueries({ queryKey: [chave] })
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
        <span className="avisos__icone">
          <Smartphone size={20} aria-hidden />
        </span>
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
        <span className="avisos__icone">
          <BellOff size={20} aria-hidden />
        </span>
        <p>Os avisos estão bloqueados. Libere as notificações do SIGCF nas configurações do navegador.</p>
      </section>
    )
  }

  if (estado === 'ativo') {
    return (
      <section className="avisos avisos--ativo">
        <span className="avisos__icone">
          <BellRing size={16} aria-hidden />
        </span>
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
        <span className="avisos__icone">
          <Bell size={20} aria-hidden />
        </span>
        <p>Receba um aviso no celular, mesmo com o app fechado, quando chegar uma coleta nova para você.</p>
        <button
          type="button"
          className="botao botao--primario"
          disabled={processando}
          onClick={() => executar(ativarAvisos)}
        >
          {processando ? <LoaderCircle size={18} className="girar" aria-hidden /> : <Bell size={18} aria-hidden />}
          {processando ? 'Ativando…' : 'Ativar avisos'}
        </button>
        <MensagemErro erro={erro} />
      </section>
    )
  }

  return null
}
