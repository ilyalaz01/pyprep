/**
 * useConfig — fetches /api/config once and caches it via TanStack Query.
 * The boot path uses this to know whether to render single-user UI.
 */
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { Config } from './types'

export function useConfig(): Config | null {
  const { data } = useQuery({
    queryKey: ['config'],
    queryFn: api.config,
    staleTime: Infinity, // boot-time config doesn't change without a redeploy
    refetchOnWindowFocus: false,
  })
  return data ?? null
}
