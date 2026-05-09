/**
 * LinkButton — visual + structural pin. Renders an anchor (TanStack
 * Link), carries the href the route resolves to, and applies the same
 * theme-token classes as Button (so action rows stay aligned).
 */
import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'

import { LinkButton } from './LinkButton'

function renderButton(node: React.ReactNode) {
  const root = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <>{node}</>,
  })
  const moduleRoute = createRoute({
    getParentRoute: () => root,
    path: '/modules/$moduleId',
    component: () => null,
  })
  const tree = root.addChildren([indexRoute, moduleRoute])
  const router = createRouter({
    routeTree: tree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}

describe('LinkButton', () => {
  test('renders an anchor pointing to the resolved route', async () => {
    renderButton(
      <LinkButton to="/modules/$moduleId" params={{ moduleId: '1' }}>
        Back to module
      </LinkButton>,
    )
    const link = await screen.findByRole('link', { name: /back to module/i })
    expect(link).toHaveAttribute('href', '/modules/1')
  })

  test('default variant is ghost; uses theme-token classes', async () => {
    renderButton(
      <LinkButton to="/modules/$moduleId" params={{ moduleId: '1' }}>
        x
      </LinkButton>,
    )
    const link = await screen.findByRole('link')
    expect(link.className).toMatch(/var\(--color-fg-muted/)
  })

  test('size sm renders with the tighter h-7 token', async () => {
    renderButton(
      <LinkButton to="/modules/$moduleId" params={{ moduleId: '1' }} size="sm">
        x
      </LinkButton>,
    )
    const link = await screen.findByRole('link')
    expect(link.className).toMatch(/h-7/)
  })
})
