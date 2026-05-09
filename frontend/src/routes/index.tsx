/**
 * Route tree (code-based, TanStack Router 1.x).
 *
 * Auth gating is done with `beforeLoad` on a parent layout route
 * (`_auth`). This is equivalent to a `<RequireAuth>` HOC but runs
 * BEFORE child rendering — no flash of protected content. The user
 * spec referred to a `<RequireAuth>` component; `beforeLoad` is the
 * idiomatic TanStack form of the same behavior.
 *
 * The `from` location is preserved as a search param (not React-Router-
 * style location.state) so the post-login navigation survives a hard
 * reload of /login.
 */
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { AppShell } from '../components/AppShell'
import { getToken } from '../lib/auth'
import { HomePage } from '../pages/HomePage'
import { LessonPage } from '../pages/LessonPage'
import { LoginPage } from '../pages/LoginPage'
import { ModuleDetailPage } from '../pages/ModuleDetailPage'

interface LoginSearch {
  from?: string
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: getToken() ? '/home' : '/login' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (raw: Record<string, unknown>): LoginSearch => ({
    from: typeof raw.from === 'string' ? raw.from : undefined,
  }),
  component: LoginPage,
})

/** Parent layout route that gates all protected children via beforeLoad
 *  AND wraps them in the AppShell (TopBar + content). */
const authedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  beforeLoad: ({ location }) => {
    if (!getToken()) {
      throw redirect({
        to: '/login',
        search: { from: location.href },
      })
    }
  },
  component: AppShell,
})

const homeRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/home',
  component: HomePage,
})

const moduleDetailRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/modules/$moduleId',
  component: ModuleDetailPage,
})

const lessonRoute = createRoute({
  getParentRoute: () => authedLayoutRoute,
  path: '/modules/$moduleId/lesson/$sphereId',
  component: LessonPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authedLayoutRoute.addChildren([homeRoute, moduleDetailRoute, lessonRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
