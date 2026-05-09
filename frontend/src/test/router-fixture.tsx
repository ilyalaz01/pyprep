/**
 * Test helper: spin up a fresh router + QueryClient + render at a given
 * URL. Each test gets its own router so route state doesn't leak.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'

import { AppShell } from '../components/AppShell'
import { getToken } from '../lib/auth'
import { HomePage } from '../pages/HomePage'
import { LessonPage } from '../pages/LessonPage'
import { LoginPage } from '../pages/LoginPage'
import { ModuleDetailPage } from '../pages/ModuleDetailPage'

interface LoginSearch { from?: string }

export function buildRouter(initialUrl: string) {
  const root = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({
    getParentRoute: () => root,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: getToken() ? '/home' : '/login' })
    },
  })
  const login = createRoute({
    getParentRoute: () => root,
    path: '/login',
    validateSearch: (raw: Record<string, unknown>): LoginSearch => ({
      from: typeof raw.from === 'string' ? raw.from : undefined,
    }),
    component: LoginPage,
  })
  const authed = createRoute({
    getParentRoute: () => root,
    id: '_auth',
    beforeLoad: ({ location }) => {
      if (!getToken()) {
        throw redirect({ to: '/login', search: { from: location.href } })
      }
    },
    component: AppShell,
  })
  const home = createRoute({
    getParentRoute: () => authed,
    path: '/home',
    component: HomePage,
  })
  const moduleDetail = createRoute({
    getParentRoute: () => authed,
    path: '/modules/$moduleId',
    component: ModuleDetailPage,
  })
  const lesson = createRoute({
    getParentRoute: () => authed,
    path: '/modules/$moduleId/lesson/$sphereId',
    component: LessonPage,
  })
  const tree = root.addChildren([
    indexRoute,
    login,
    authed.addChildren([home, moduleDetail, lesson]),
  ])
  return createRouter({
    routeTree: tree,
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
  })
}

export function renderAt(url: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = buildRouter(url)
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, router, queryClient }
}
