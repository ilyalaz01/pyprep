// /modules/$moduleId/sphere/$sphereId/session — runs a card session
// end-to-end. Per ADR-017 the route is nested (mirrors the lesson route
// hierarchy + makes sphere_id collisions in MVP-2 explicit). State maps
// useSession.status → 5 UI variants: loading skeleton · error+Retry ·
// empty (status=finished && cardsTotal=0) · active CardShell · finished
// SessionSummary. Resumption-on-revisit is intentionally NOT supported
// in MVP — each navigation issues a fresh POST /api/sessions.
// T5.12 wires global keymap (Space/1-4/Esc) + cheatsheet footer.
import { useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { CardRenderer } from '../components/CardRenderer'
import { CardShell } from '../components/CardShell'
import { LinkButton } from '../components/LinkButton'
import { SessionSummary } from '../components/SessionSummary'
import { parseCard } from '../lib/card-types'
import { useSession } from '../lib/use-session'
import { useSessionKeys } from '../lib/use-session-keys'

export function SessionPage() {
  const { moduleId, sphereId } = useParams({
    from: '/_auth/modules/$moduleId/sphere/$sphereId/session',
  })
  // P7.T7.9 / ADR-026: ?practice=true is the "Practice anyway" entry —
  // EmptySession's caught-up CTA navigates here so the new session
  // bypasses the daily cap.
  const search = useSearch({
    from: '/_auth/modules/$moduleId/sphere/$sphereId/session',
  }) as { practice?: boolean }
  const [retryKey, setRetryKey] = useState(0)
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <SessionRunner
        key={`${retryKey}-${search.practice ? 'practice' : 'normal'}`}
        moduleId={Number(moduleId)}
        sphereId={sphereId}
        practice={search.practice === true}
        onRetry={() => setRetryKey((k) => k + 1)}
      />
    </section>
  )
}

function KeymapCheatsheet() {
  // ⎵ is the Unicode "BENCHMARK" symbol used for the Space key.
  return (
    <p
      data-testid="keymap-cheatsheet"
      className="text-center text-xs text-[color:var(--color-fg-subtle)] font-mono"
    >
      ⎵ reveal · 1 Again · 2 Hard · 3 Good · 4 Easy · esc exit
    </p>
  )
}

function SessionRunner({
  moduleId, sphereId, practice, onRetry,
}: { moduleId: number; sphereId: string; practice: boolean; onRetry: () => void }) {
  // mode='mixed' is the right default for both fresh users (no Reviews
  // → falls back to new cards under daily_new_card_cap) and existing
  // users (review-due first, top up with new). practice=true flips
  // overrideDailyCap for the "Practice anyway" path (ADR-026).
  const session = useSession({
    mode: 'mixed', sphereId, moduleId, limit: 20,
    overrideDailyCap: practice,
  })
  const navigate = useNavigate()
  useSessionKeys({
    enabled: session.status !== 'finished' && session.status !== 'error',
    onExit: () => void navigate({
      to: '/modules/$moduleId', params: { moduleId: String(moduleId) },
    }),
  })
  return (
    <>
      <SessionBody session={session} moduleId={moduleId} sphereId={sphereId} onRetry={onRetry} />
      {session.status !== 'finished' ? <KeymapCheatsheet /> : null}
    </>
  )
}

function SessionBody({
  session, moduleId, sphereId, onRetry,
}: {
  session: ReturnType<typeof useSession>
  moduleId: number; sphereId: string; onRetry: () => void
}) {
  if (session.status === 'loading') return <SessionSkeleton />
  if (session.status === 'error') {
    return (
      <div className="space-y-4">
        <Banner variant="error">
          {session.error?.message ?? "Couldn't start the session."}
        </Banner>
        <Button variant="secondary" onClick={onRetry}>Retry</Button>
      </div>
    )
  }
  if (session.status === 'finished' && session.cardsTotal === 0) {
    return (
      <EmptySession
        moduleId={moduleId}
        sphereId={sphereId}
        totalCardsInSphere={session.totalCardsInSphere}
      />
    )
  }
  if (session.status === 'finished') {
    return <SessionSummary details={session.details} moduleId={moduleId} sphereId={sphereId} />
  }
  if (session.currentCard === null) return <SessionSkeleton />
  const card = parseCard(session.currentCard.raw)
  return (
    <CardShell card={card} position={{
      index: session.completedCount + 1, total: session.cardsTotal,
    }}>
      <CardRenderer
        card={card}
        onRate={session.submitAnswer}
        attemptIndex={session.currentAttemptIndex}
      />
    </CardShell>
  )
}

function SessionSkeleton() {
  return (
    <div data-testid="session-skeleton" className="space-y-3" aria-hidden="true">
      <div className="h-4 w-2/3 bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-full bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-5/6 bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-3/4 bg-[color:var(--color-bg-elevated)] rounded" />
    </div>
  )
}

function EmptySession({
  moduleId, sphereId, totalCardsInSphere,
}: { moduleId: number; sphereId: string; totalCardsInSphere: number | null }) {
  // Two distinct empty cases:
  //   - "no cards authored" — content gap, no CTA forward
  //   - "caught up for today" — daily cap exhausted; P7.T7.9 / ADR-026
  //     adds a "Practice anyway" CTA that re-enters via ?practice=true
  //     bypassing the cap. Reviews persist normally.
  const caughtUp = totalCardsInSphere !== 0
  const message = caughtUp
    ? "You're caught up. Come back tomorrow for new cards."
    : 'This sphere has no cards yet.'
  return (
    <div className="space-y-6">
      <p className="text-sm text-[color:var(--color-fg-muted)]">{message}</p>
      <div className="flex flex-wrap gap-3">
        <LinkButton
          variant="secondary"
          to="/modules/$moduleId"
          params={{ moduleId: String(moduleId) }}
        >
          Back to module
        </LinkButton>
        {caughtUp ? (
          <LinkButton
            variant="primary"
            to="/modules/$moduleId/sphere/$sphereId/session"
            params={{ moduleId: String(moduleId), sphereId }}
            search={{ practice: true }}
          >
            Practice anyway
          </LinkButton>
        ) : null}
      </div>
    </div>
  )
}

