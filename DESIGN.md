# Design

> **Status:** seeded starter, written before any frontend code beyond the
> Vite scaffold. Re-run `/impeccable document` after T4.6 (component
> library) to capture the real tokens; this file's job until then is to
> keep design choices coherent across T4.1–T4.6.

## Theme

**Dark by default**, with a light variant toggled by `prefers-color-scheme`
(no in-app switcher in MVP-1). Physical scene driving the choice: an
Israeli CS student studying for 60 minutes after work in a dim apartment,
staring at code editors all day, alternating between `npm dev` and PyPrep
in adjacent browser tabs. Dark base reduces eye fatigue across that
context-switch. The light variant exists for the rare sunlit-balcony /
shared-screen / bug-report-screenshot case; it is not the demo screenshot.

This is **not** a category reflex ("technical tool → dark"). It's the
physical scene: dark monitor + dim room + already-dark adjacent IDE.

## Color strategy

**Restrained** (per impeccable shared laws): tinted neutrals carry ≥90 %
of every surface; one accent ≤10 % for the rare primary CTA; state
colors (green / amber / red) appear only on outcome moments (rating
buttons, due-card badges, test-pass/fail), never decoratively.

All values are OKLCH. Neutrals tint warm — chroma ≈ 0.006, hue 80°
(toward amber). This pulls the dark base away from the cool-blue
default that signals "tech dashboard."

### Tokens (defined in `frontend/src/styles/theme.css` `@theme` block)

```
/* dark base — default */
--color-bg            oklch(0.18 0.006 80)   /* page background, warm dark */
--color-surface       oklch(0.22 0.006 80)   /* panels, modals, code blocks */
--color-surface-2     oklch(0.26 0.006 80)   /* inset sub-panels, hover */
--color-border        oklch(0.32 0.006 80)   /* hairlines */
--color-border-strong oklch(0.42 0.006 80)   /* focus rings, active borders */

--color-fg            oklch(0.94 0.005 80)   /* primary text */
--color-fg-muted      oklch(0.74 0.005 80)   /* secondary text */
--color-fg-faint      oklch(0.56 0.005 80)   /* placeholders, captions */

--color-accent        oklch(0.78 0.13 70)    /* brand: warm ochre, ≤10 % surface */
--color-accent-fg     oklch(0.18 0.006 80)   /* on-accent text */

--color-good          oklch(0.78 0.14 145)   /* correct / pass */
--color-warn          oklch(0.82 0.14 80)    /* hard / due-soon */
--color-bad           oklch(0.65 0.18 25)    /* again / fail / overdue */
```

Light-variant overrides:

```
@media (prefers-color-scheme: light) {
  --color-bg            oklch(0.98 0.004 80)
  --color-surface       oklch(0.95 0.005 80)
  --color-surface-2     oklch(0.91 0.006 80)
  --color-border        oklch(0.85 0.006 80)
  --color-border-strong oklch(0.70 0.008 80)
  --color-fg            oklch(0.20 0.005 80)
  --color-fg-muted      oklch(0.42 0.005 80)
  --color-fg-faint      oklch(0.62 0.005 80)
  --color-accent        oklch(0.55 0.14 70)
  --color-accent-fg     oklch(0.98 0.004 80)
}
```

State colors (good/warn/bad) keep their dark-mode hue across themes —
the contrast ratio is what changes via lightness shift; the meaning
must not. Both variants pass WCAG AA contrast for body text and
WCAG AA contrast for state-color backgrounds against `--color-fg`.

**Color is never the sole signal for state** (PRODUCT.md accessibility
clause). Rating buttons carry text labels (Again / Hard / Good / Easy)
plus keyboard digits (1/2/3/4); due-card badges carry an icon glyph in
addition to color.

## Typography

**No Inter.** The audience reads documentation for a living and would
recognize Inter on contact as "yet another SaaS." Type system pairs:

| Role | Family | Why |
|---|---|---|
| Sans (UI, body, headings) | **Geist Sans** | Vercel's open-source UI sans; opinionated geometry, real italics, designed for technical surfaces. Pairs with Geist Mono. |
| Mono (code, IDs, numbers) | **Geist Mono** | Same family lineage as Geist Sans — co-designed metrics. Distinct enough from JetBrains Mono / Fira to feel deliberate. |
| Editorial (lesson body) | Geist Sans | Reuse — no third typeface; lesson copy is technical, not literary. |

Loaded via `npm install geist` and the `<GeistSans />` / `<GeistMono />`
font objects (no FOIT, variable axes available).

### Scale

Hierarchy by weight + size, ratio ≥ 1.25 between steps. Avoid flat
scales.

```
--text-xs   0.75rem   /* captions, badges */
--text-sm   0.875rem  /* secondary UI, table cells */
--text-base 1rem      /* body */
--text-lg   1.125rem  /* lead paragraph in lesson reader */
--text-xl   1.375rem  /* section headings */
--text-2xl  1.75rem   /* page titles */
--text-3xl  2.25rem   /* (rare) module titles */
```

Body line-length capped at **70ch** (per impeccable shared law). Lesson
reader uses `max-width: 70ch`. Code blocks within lessons get full
container width.

Line-height: 1.5 for body, 1.3 for headings, 1.6 for lesson prose,
1.45 for code blocks.

## Spacing & rhythm

Tailwind v4 default scale (4px base). **Vary spacing** across components
— monotone padding everywhere reads as flat. Specific rhythm rules:

- Lesson sections separated by `space-y-8`; paragraphs by `space-y-4`;
  inline code blocks by `space-y-3`.
- Card-session controls (rating row): `gap-2`, equal sizes.
- Sidebar nav items: `py-1.5 px-3`, 8px gap between groups, 16px gap
  between sections.
- No `p-4` everywhere. Resist the reflex.

## Motion

- Easing: `ease-out` with `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quart)
  by default. **No bounce, no spring.**
- Duration: 120ms for hover/focus state changes; 200ms for transform
  reveals (card flip, accordion); 0 for layout properties (which we
  don't animate per shared law).
- `prefers-reduced-motion: reduce` → all transitions become 0ms; only
  opacity changes survive (and instantly).
- Card flip: opacity crossfade + `translateY(-2px)` on the new face;
  no 3D `rotateY` flip. The literal flip is a Duolingo affordance and
  we're avoiding it.

## Component primitives (T4.6 will produce the real ones)

The in-house component library at `frontend/src/components/`:

- `Button` — `primary` | `secondary` | `ghost`. Primary uses `--color-accent`;
  secondary uses `--color-surface-2` border; ghost is text-only.
  Focus ring: 2px `--color-border-strong` offset 2px. No shadows.
- `Input` — single-line text. Focus ring same as Button. Error state
  outlines with `--color-bad` and shows a subtle inline message
  (icon + text).
- `Badge` — small status pill. Variants: `due` (warn), `new` (accent),
  `done` (good), `late` (bad).
- `Card` (the structural one, not the flashcard) — only used when truly
  the right affordance. **Never nest a Card inside a Card** (forbidden
  per shared laws). Most lists, panels, and forms don't need one.
- `CodeBlock` — Geist Mono on `--color-surface-2`, no syntax highlighting
  at the primitive level (lesson reader handles highlighting via
  Shiki/Prism in the renderer, not here).

## Layout

- App shell: persistent left rail (collapsed-icon + expanded-label
  variants), top header for page-title + user-menu, content area max
  `1200px` centered with `p-8` outer.
- Login: single column, vertically centered, max `400px` wide.
- Lesson reader: 70ch text column, code blocks break out to `min(960px,
  100%)`.
- **No nested cards.** Re-read forbidden-patterns list before proposing
  any layout that uses background-on-background-on-background depth.

## Anti-references applied to design choices

Every choice above was made AGAINST a specific anti-reference:

- Dark warm-amber-tinted base instead of cool-blue default → avoids "AI
  SaaS dashboard" reflex.
- Geist over Inter → audience would recognize Inter; Geist signals
  "deliberate."
- Restrained color strategy → no purple/blue gradient hero.
- Card primitive used sparingly + nesting banned → no "cards-in-cards."
- No icon-tile-above-heading pattern in any component → avoids the
  rounded-square-icon-tile reflex.
- Ease-out-quart, no spring → avoids bouncy SaaS micro-interactions.
- Text labels next to color-coded rating buttons → not relying on color
  alone, not relying on emoji either.

## When to revisit

- After **T4.6** (component library lands): re-run `/impeccable document`
  to capture the *real* tokens used, replacing this seed.
- After **Phase 4 close** (T4.7) → owner runs `/impeccable audit`; this
  file is the spec the audit measures against.
- If the brand register changes (e.g. PyPrep adds a marketing landing
  page in Phase 10) → that landing surface gets a separate brand-mode
  audit; the product surface defined here doesn't shift to brand mode.
