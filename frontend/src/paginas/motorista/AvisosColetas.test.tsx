import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderizar, sessaoDe } from '../../testes/renderizar.tsx'
import { AvisosColetas } from './AvisosColetas.tsx'

const app = vi.hoisted(() => ({
  ativar: vi.fn(),
  abrirConfiguracoes: vi.fn(),
}))
vi.mock('../../nativo/plataforma.ts', () => ({ ehAppNativo: () => true }))
vi.mock('../../nativo/avisosNoApp.ts', () => ({ ativarAvisosNoApp: app.ativar }))
vi.mock('../../nativo/gpsEmSegundoPlano.ts', () => ({ abrirConfiguracoesDoApp: app.abrirConfiguracoes }))

const abrir = () => renderizar(<AvisosColetas />, { sessao: sessaoDe('MOTORISTA') })

describe('AvisosColetas no app Android', () => {
  afterEach(() => vi.clearAllMocks())

  it('ativa os avisos sozinho, sem o botão do navegador, e mostra que estão ativos', async () => {
    app.ativar.mockResolvedValue('ativo')
    abrir()

    expect(await screen.findByText('Avisos de coleta ativados neste celular.')).toBeInTheDocument()
    expect(app.ativar).toHaveBeenCalledWith(expect.any(Function))
    expect(screen.queryByRole('button', { name: 'Ativar avisos' })).not.toBeInTheDocument()
  })

  it('leva às configurações quando as notificações estão bloqueadas', async () => {
    app.ativar.mockResolvedValue('negado')
    abrir()

    expect(await screen.findByText(/Os avisos de coleta estão bloqueados/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir configurações' }))

    expect(app.abrirConfiguracoes).toHaveBeenCalled()
  })

  it('não mostra nada quando o aparelho não consegue receber avisos', async () => {
    app.ativar.mockRejectedValue(new Error('Firebase não configurado'))
    const { container } = abrir()

    await vi.waitFor(() => expect(app.ativar).toHaveBeenCalled())
    expect(container.querySelector('.avisos')).toBeNull()
  })
})
