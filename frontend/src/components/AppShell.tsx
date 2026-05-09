/**
 * AppShell — TopBar + main content. Used as the layout component for
 * the `_auth` route in `routes/index.tsx`; everything authed renders
 * inside the `<Outlet />` below the TopBar.
 */
import { Outlet } from '@tanstack/react-router'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="min-h-full flex flex-col">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
