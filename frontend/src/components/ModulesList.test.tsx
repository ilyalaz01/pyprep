import { describe, expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'

import { ModulesList } from './ModulesList'
import type { ModulesList as ModulesListData } from '../lib/types'

/**
 * Wrap ModulesList in a minimal in-memory router so its <Link> calls
 * can resolve. The router stub just needs `/` and `/modules/$moduleId`
 * routes to satisfy type-checked Link targets.
 */
function renderList(data: ModulesListData) {
  const root = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <ModulesList data={data} />,
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

describe('ModulesList', () => {
  test('renders all 4 modules from the hard-coded roster', async () => {
    renderList({ modules: [] })
    expect(await screen.findByText(/Python Core & OOP/)).toBeInTheDocument()
    expect(screen.getByText(/Automation, Scripting & Infrastructure/)).toBeInTheDocument()
    expect(screen.getByText(/Testing & QA/)).toBeInTheDocument()
    expect(screen.getByText(/Linux, Docker, SQL & Git/)).toBeInTheDocument()
  })

  test('module without content renders dimmed and aria-disabled (not a link)', async () => {
    renderList({ modules: [] })
    const txt = await screen.findByText(/Automation, Scripting & Infrastructure/)
    const m2Row = txt.closest('div')
    expect(m2Row).toHaveAttribute('aria-disabled', 'true')
    expect(within(m2Row!).getByText(/no content yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Module 2/i })).not.toBeInTheDocument()
  })

  test('module with content renders as a link with sphere + card counts', async () => {
    renderList({ modules: [{ module_id: 1, sphere_ids: ['m1-s0', 'm1-s1'], card_count: 23 }] })
    const link = await screen.findByRole('link', { name: /Module 1/i })
    expect(link).toHaveAttribute('href', '/modules/1')
    expect(link).toHaveTextContent(/2 spheres · 23 cards/)
  })

  test('singular sphere/card pluralization is correct', async () => {
    renderList({ modules: [{ module_id: 1, sphere_ids: ['x'], card_count: 1 }] })
    expect(await screen.findByText(/1 sphere · 1 card/)).toBeInTheDocument()
  })
})
