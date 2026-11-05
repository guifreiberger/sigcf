import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, montarQuery } from './cliente.ts'
import type {
  Cliente,
  Inteligencia,
  Localizacao,
  Motorista,
  MotoristaEmRota,
  Ordem,
  Resumo,
  StatusOrdem,
  Trajeto,
  Veiculo,
} from './tipos.ts'

export type Recurso = 'motoristas' | 'veiculos' | 'clientes'

export interface TipoPorRecurso {
  motoristas: Motorista
  veiculos: Veiculo
  clientes: Cliente
}

export function useCadastro<R extends Recurso>(recurso: R, ativo?: boolean) {
  return useQuery({
    queryKey: [recurso, ativo],
    queryFn: () => api<TipoPorRecurso[R][]>(`/${recurso}${montarQuery({ ativo })}`),
  })
}

export function useSalvarCadastro(recurso: Recurso) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id?: number; dados: object }) =>
      id
        ? api(`/${recurso}/${id}`, { metodo: 'PATCH', corpo: dados })
        : api(`/${recurso}`, { metodo: 'POST', corpo: dados }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [recurso] }),
  })
}

export function useAlternarAtivo(recurso: Recurso) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      ativo
        ? api(`/${recurso}/${id}`, { metodo: 'PATCH', corpo: { ativo: true } })
        : api(`/${recurso}/${id}`, { metodo: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [recurso] }),
  })
}

export interface FiltrosOrdens {
  data?: string
  status?: StatusOrdem | ''
  motoristaId?: number
  clienteId?: number
}

export function useOrdens(filtros: FiltrosOrdens, atualizarACada?: number) {
  return useQuery({
    queryKey: ['ordens', filtros],
    queryFn: () => api<Ordem[]>(`/ordens${montarQuery({ ...filtros })}`),
    refetchInterval: atualizarACada,
  })
}

export function useResumo(data: string, atualizarACada?: number) {
  return useQuery({
    queryKey: ['resumo', data],
    queryFn: () => api<Resumo>(`/ordens/resumo${montarQuery({ data })}`),
    refetchInterval: atualizarACada,
  })
}

export function useOrdem(id: number) {
  return useQuery({
    queryKey: ['ordem', id],
    queryFn: () => api<Ordem>(`/ordens/${id}`),
  })
}

export function useMinhasColetas(data: string) {
  return useQuery({
    queryKey: ['minhas', data],
    queryFn: () => api<Ordem[]>(`/ordens/minhas${montarQuery({ data })}`),
    refetchInterval: 60_000,
  })
}

export function useCriarOrdem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: object) => api<Ordem>('/ordens', { metodo: 'POST', corpo: dados }),
    onSuccess: () => {
      for (const chave of ['ordens', 'resumo', 'inteligencia']) {
        queryClient.invalidateQueries({ queryKey: [chave] })
      }
    },
  })
}

export function useInteligencia() {
  return useQuery({
    queryKey: ['inteligencia'],
    queryFn: () => api<Inteligencia>('/inteligencia/clientes'),
  })
}

export function useAlterarStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      motivo,
      localizacao,
    }: {
      id: number
      status: StatusOrdem
      motivo?: string
      localizacao?: Localizacao
    }) => api<Ordem>(`/ordens/${id}/status`, { metodo: 'PATCH', corpo: { status, motivo, localizacao } }),
    onSuccess: (ordem) => {
      queryClient.setQueryData(['ordem', ordem.id], ordem)
      for (const chave of ['ordens', 'resumo', 'minhas', 'trajeto', 'em-rota']) {
        queryClient.invalidateQueries({ queryKey: [chave] })
      }
    },
  })
}

export function useTrajeto(ordemId: number) {
  return useQuery({
    queryKey: ['trajeto', ordemId],
    queryFn: () => api<Trajeto>(`/rastreamento/ordens/${ordemId}`),
    // Ao vivo só enquanto a coleta está em andamento; depois o trajeto não muda mais.
    refetchInterval: (query) => (query.state.data?.status === 'EM_ANDAMENTO' ? 10_000 : false),
  })
}

export function useEmRota(atualizarACada?: number) {
  return useQuery({
    queryKey: ['em-rota'],
    queryFn: () => api<MotoristaEmRota[]>('/rastreamento/em-rota'),
    refetchInterval: atualizarACada,
  })
}
