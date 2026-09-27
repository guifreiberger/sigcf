import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, montarQuery } from './cliente.ts'
import type { Cliente, Localizacao, Motorista, Ordem, Resumo, StatusOrdem, Veiculo } from './tipos.ts'

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
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
      queryClient.invalidateQueries({ queryKey: ['resumo'] })
    },
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
      for (const chave of ['ordens', 'resumo', 'minhas']) {
        queryClient.invalidateQueries({ queryKey: [chave] })
      }
    },
  })
}
