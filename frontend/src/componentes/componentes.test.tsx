import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CircleAlert } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/cliente.ts'
import { Dialogo } from './Dialogo.tsx'
import { DialogoMotivo } from './DialogoMotivo.tsx'
import { Carregando, MensagemErro, Vazio } from './Estados.tsx'
import { IconeStatus } from './IconeStatus.tsx'
import { StatusBadge } from './StatusBadge.tsx'

describe('componentes compartilhados', () => {
  describe('estados da tela', () => {
    it('Carregando anuncia o carregamento para leitores de tela', () => {
      render(<Carregando texto="Buscando coletas…" />)

      expect(screen.getByRole('status')).toHaveTextContent('Buscando coletas…')
    })

    it('MensagemErro mostra a mensagem do erro como alerta', () => {
      render(<MensagemErro erro={new ApiError(409, 'Já existe um veículo com esta placa.')} />)

      expect(screen.getByRole('alert')).toHaveTextContent('Já existe um veículo com esta placa.')
    })

    it('MensagemErro usa um texto genérico para erros desconhecidos e some sem erro', () => {
      const { rerender } = render(<MensagemErro erro="falhou" />)
      expect(screen.getByRole('alert')).toHaveTextContent('Ocorreu um erro inesperado.')

      rerender(<MensagemErro erro={null} />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('Vazio mostra a orientação com o ícone escolhido', () => {
      const { container } = render(<Vazio icone={CircleAlert}>Nenhuma coleta hoje.</Vazio>)

      expect(screen.getByText('Nenhuma coleta hoje.')).toBeInTheDocument()
      expect(container.querySelector('.lucide-circle-alert')).toBeInTheDocument()
    })
  })

  describe('status da ordem', () => {
    it.each([
      ['AGUARDANDO', 'Aguardando'],
      ['EM_ANDAMENTO', 'Em andamento'],
      ['CONCLUIDA', 'Concluída'],
      ['FALHA', 'Falha'],
      ['CANCELADA', 'Cancelada'],
    ] as const)('StatusBadge exibe %s como "%s"', (status, rotulo) => {
      render(<StatusBadge status={status} />)

      const badge = screen.getByText(rotulo)
      expect(badge).toHaveClass(`badge--${status.toLowerCase()}`)
    })

    it('IconeStatus é decorativo e usa um ícone por status', () => {
      const { container } = render(<IconeStatus status="EM_ANDAMENTO" size={16} />)

      const icone = container.querySelector('svg')
      expect(icone).toHaveClass('lucide-truck')
      expect(icone).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Dialogo', () => {
    it('abre como modal e mostra o conteúdo só enquanto aberto', () => {
      const { rerender } = render(
        <Dialogo aberto titulo="Concluir coleta" aoFechar={() => {}}>
          <p>Confirma?</p>
        </Dialogo>,
      )
      expect(screen.getByRole('dialog', { name: 'Concluir coleta' })).toHaveAttribute('open')
      expect(screen.getByText('Confirma?')).toBeInTheDocument()

      rerender(
        <Dialogo aberto={false} titulo="Concluir coleta" aoFechar={() => {}}>
          <p>Confirma?</p>
        </Dialogo>,
      )
      expect(screen.queryByText('Confirma?')).not.toBeInTheDocument()
    })

    it('fecha pelo botão de fechar', async () => {
      const aoFechar = vi.fn()
      render(
        <Dialogo aberto titulo="Concluir coleta" aoFechar={aoFechar}>
          <p>Confirma?</p>
        </Dialogo>,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

      expect(aoFechar).toHaveBeenCalled()
    })
  })

  describe('DialogoMotivo', () => {
    const props = {
      aberto: true,
      titulo: 'Reportar falha',
      descricao: 'O que impediu a coleta?',
      rotuloConfirmar: 'Reportar falha',
      enviando: false,
      erro: null,
      aoFechar: () => {},
    }

    it('só permite confirmar depois de informar o motivo, sem espaços nas pontas', async () => {
      const aoConfirmar = vi.fn()
      render(<DialogoMotivo {...props} aoConfirmar={aoConfirmar} />)
      const confirmar = screen.getByRole('button', { name: 'Reportar falha' })

      expect(confirmar).toBeDisabled()
      await userEvent.type(screen.getByLabelText('Motivo'), '  Portão fechado  ')
      await userEvent.click(confirmar)

      expect(aoConfirmar).toHaveBeenCalledWith('Portão fechado')
    })

    it('preenche o motivo com uma sugestão', async () => {
      const aoConfirmar = vi.fn()
      render(
        <DialogoMotivo {...props} sugestoes={['Cliente ausente', 'Problema no veículo']} aoConfirmar={aoConfirmar} />,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Cliente ausente' }))

      expect(screen.getByLabelText('Motivo')).toHaveValue('Cliente ausente')
      expect(screen.getByRole('button', { name: 'Cliente ausente' })).toHaveClass('chip--ativo')
      await userEvent.click(screen.getByRole('button', { name: 'Reportar falha' }))
      expect(aoConfirmar).toHaveBeenCalledWith('Cliente ausente')
    })

    it('mostra o envio em andamento e o erro do backend', () => {
      render(
        <DialogoMotivo
          {...props}
          enviando
          erro={new ApiError(400, 'Informe o motivo.')}
          aoConfirmar={() => {}}
        />,
      )

      expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
      expect(screen.getByRole('alert')).toHaveTextContent('Informe o motivo.')
    })

    it('volta sem confirmar', async () => {
      const aoFechar = vi.fn()
      render(<DialogoMotivo {...props} aoFechar={aoFechar} aoConfirmar={() => {}} />)

      await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

      expect(aoFechar).toHaveBeenCalled()
    })
  })
})
