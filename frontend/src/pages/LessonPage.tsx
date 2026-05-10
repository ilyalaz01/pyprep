/**
 * /modules/:moduleId/lesson/:sphereId — one lesson surface.
 *
 * Branches:
 *   - loading: subtle skeleton (NOT "Loading…" text)
 *   - error: Banner + retry
 *   - empty content (sphere exists, lesson_md missing): "Lesson content
 *     coming soon" + back button. Don't 404 — sphere exists in module.
 *   - happy: LessonReader + LessonActions
 */
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Banner } from '../components/Banner'
import { LessonActions } from '../components/LessonActions'
import { LessonReader } from '../components/LessonReader'
import { LinkButton } from '../components/LinkButton'
import { api } from '../lib/api'

export function LessonPage() {
  const { moduleId, sphereId } = useParams({
    from: '/_auth/modules/$moduleId/lesson/$sphereId',
  })
  const id = Number(moduleId)
  const lesson = useQuery({
    queryKey: ['lesson', id, sphereId],
    queryFn: () => api.modules.lesson(id, sphereId),
    retry: false,
  })

  // T4.5.1: H1 reads from frontmatter title (sphere_id is the technical
  // address shown in the breadcrumb, NOT the human label).
  // T4.5.2: breadcrumb keeps natural lowercase case (no `uppercase` CSS).
  const h1 = lesson.data?.lesson_title ?? sphereId
  const minutes = lesson.data?.lesson_estimated_minutes ?? null

  return (
    <section className="mx-auto max-w-[680px] px-6 py-10">
      <header className="mb-8 space-y-1">
        <p className="text-xs tracking-wide text-[color:var(--color-fg-subtle)]">
          Module {id} · {sphereId}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{h1}</h1>
        {minutes !== null && (
          <p className="text-sm text-[color:var(--color-fg-subtle)]">
            {minutes} min read
          </p>
        )}
      </header>

      {lesson.isLoading && <LessonSkeleton />}

      {lesson.isError && (
        <Banner variant="error">
          Couldn't load this lesson.{' '}
          <button
            onClick={() => lesson.refetch()}
            className="underline underline-offset-4"
          >
            Retry
          </button>
        </Banner>
      )}

      {lesson.data && (
        lesson.data.lesson_md.trim().length === 0 ? (
          <EmptyLesson moduleId={id} />
        ) : (
          <>
            <LessonReader markdown={lesson.data.lesson_md} />
            <LessonActions
              moduleId={id}
              sphereId={sphereId}
              cardCount={lesson.data.card_count}
            />
          </>
        )
      )}
    </section>
  )
}

function LessonSkeleton() {
  return (
    <div data-testid="lesson-skeleton" className="space-y-3" aria-hidden="true">
      <div className="h-4 w-2/3 bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-full bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-5/6 bg-[color:var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-3/4 bg-[color:var(--color-bg-elevated)] rounded" />
    </div>
  )
}

function EmptyLesson({ moduleId }: { moduleId: number }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[color:var(--color-fg-muted)]">
        Lesson content coming soon.
      </p>
      <LinkButton
        variant="secondary"
        to="/modules/$moduleId"
        params={{ moduleId: String(moduleId) }}
      >
        Back to module
      </LinkButton>
    </div>
  )
}
