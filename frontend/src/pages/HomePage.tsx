/**
 * /home — placeholder until T4.4 builds the real review/streak/weakness
 * widgets. T4.2 only needs this to exist as a redirect target.
 */
export function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        Logged in. T4.4 will populate this surface with the daily review
        queue, streak, and weakness panel.
      </p>
    </main>
  )
}
