/**
 * Mini in-memory router fixture for component tests that mount a
 * single component with TanStack `<Link>` calls in isolation.
 *
 * The full `renderAt` helper in router-fixture.tsx mounts the real
 * page tree (LessonPage, ModuleDetailPage, etc.) and is overkill when
 * all you need is a router context so a `<Link to=...>` resolves.
 *
 * Usage:
 *   renderInMiniRouter(<HomeDashboard />, [
 *     '/modules/$moduleId/lesson/$sphereId',
 *   ])
 */
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'

export function renderInMiniRouter(
  node: ReactNode,
  stubPaths: string[] = [],
): RenderResult {
  const root = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <>{node}</>,
  })
  const stubs = stubPaths.map((path) =>
    createRoute({
      getParentRoute: () => root,
      path,
      component: () => null,
    }),
  )
  const tree = root.addChildren([indexRoute, ...stubs])
  const router = createRouter({
    routeTree: tree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}
