/**
 * useCurrentUser — fetches /api/auth/me. Cached via TanStack Query;
 * the bearer token in localStorage is the cache key (so a logout +
 * login as a different user invalidates correctly).
 */
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { getToken } from './auth'
import type { User } from './types'

export function useCurrentUser(): User | null {
  const token = getToken()
  const { data } = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: api.auth.me,
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 min — identity rarely changes mid-session
    refetchOnWindowFocus: false,
  })
  return data ?? null
}
