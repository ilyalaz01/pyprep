# Components

In-house primitives. No UI kit (per ADR-008). All colors via theme tokens
defined in `src/index.css` `@theme` block — no magic Tailwind colors.
Each file ≤120 LOC.

When in doubt: check `DESIGN.md` at the repo root before adding chrome.

---

## Primitives

### `Button`

`<button>` element with brand-aware variants. Default `type="button"`
(prevents accidental form submission).

| prop | values | default | notes |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'secondary'` | primary uses `--color-accent`; secondary has a `--color-border` outline; ghost is text-only |
| `size` | `'md' \| 'sm'` | `'md'` | `md` = `h-9 px-4 text-sm`; `sm` = `h-7 px-3 text-xs` |
| `disabled` | `boolean` | `false` | `opacity-50 cursor-not-allowed`; click handler suppressed |
| _all `<button>` props_ | — | — | `onClick`, `type`, `aria-*`, etc. forwarded |

Focus ring: 2px outline, `--color-border-strong`, offset 2px.

### `LinkButton`

TanStack `<Link>` styled identically to `Button`. Use when navigation
should look + feel like a button — primary actions, action rows. For
prose-style hyperlinks inside paragraphs, use plain `<Link>` with the
`underline-offset-4 underline` pattern.

| prop | values | default | notes |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'ghost'` | mirrors Button variants |
| `size` | `'md' \| 'sm'` | `'md'` | mirrors Button sizes |
| _all TanStack `LinkProps`_ | — | — | `to`, `params`, `search`, etc. forwarded |

### `Input`

Single-line `<input>` with focus ring + invalid state.

| prop | values | default | notes |
|---|---|---|---|
| `invalid` | `boolean` | `false` | sets `aria-invalid="true"`, swaps focus + border to `--color-danger` |
| `disabled` | `boolean` | `false` | matches Button's disabled treatment |
| _all `<input>` props_ | — | — | `type` (text/password/email), `value`, `onChange`, `placeholder`, `required`, etc. |

Height/text tokens match `Button` md (`h-9 text-sm`) so input + button
rows align horizontally.

### `FormField`

Label + input slot + per-field error or hint. Pair with `Input`.

| prop | values | default | notes |
|---|---|---|---|
| `id` | `string` | _required_ | used for `<label for>` and the input's id |
| `label` | `string` | _required_ | rendered above the input in `--color-fg-muted` |
| `error` | `string \| null` | `null` | error wins over hint; rendered with `role="alert"` + `▲` glyph in `--color-danger` |
| `hint` | `string \| null` | `null` | rendered in `--color-fg-subtle` when no error |
| `children` | `ReactNode` | _required_ | usually an `<Input id={id}>` |

The `▲` glyph + the color carry the error signal jointly — color is never
the sole channel.

### `Banner`

Full-form-width status row. Variants `info | error | success`. Always
carries an icon glyph plus the color tint — color never sole signal.

| prop | values | default | notes |
|---|---|---|---|
| `variant` | `'info' \| 'error' \| 'success'` | `'info'` | error → `role="alert"` (interruptive); info/success → `role="status"` (polite) |
| `children` | `ReactNode` | _required_ | message body |

Use for "the whole submission failed / state has changed" cases. For
per-field validation, use `FormField`'s inline `error` slot instead.

### `Section`

Header + content slot for dashboard sections. Flat — no card chrome
(per `DESIGN.md`).

| prop | values | default | notes |
|---|---|---|---|
| `title` | `string` | _required_ | uppercase, tracking-wide, `text-sm`, `--color-fg-subtle` |
| `action` | `ReactNode` | `null` | optional right-aligned action (e.g. a "Review now" button) |
| `children` | `ReactNode` | _required_ | section body |

---

## Composed components

These wire primitives together for specific surfaces. Not reusable in
isolation — listed here so future readers know where layout chrome
actually lives.

| component | purpose |
|---|---|
| `AppShell` | TopBar + `<Outlet />`. Used as the layout component for the `_auth` route in `routes/index.tsx`. |
| `TopBar` | Persistent top chrome on every authed route. Wordmark + single-user badge + user email + Sign out. |
| `ModulesList` | The 4-row module roster on `/home`. Hard-codes the PRD module names. |
| `HomeDashboard` | Continue / Review queue / Weakness top-3 sections on `/home`. |
| `LessonReader` | Markdown body via react-markdown + remark-gfm; code blocks routed to `ShikiCodeBlock`. |
| `ShikiCodeBlock` | Lazy-loads shiki, renders highlighted HTML. Falls back to plain `<pre><code>` until WASM tokenizer settles. |
| `LessonActions` | Bottom-of-lesson row: primary `Button` (Start review session) + ghost `LinkButton` (Back to module). |

---

## Design system inputs

Tokens live in `src/index.css` `@theme` block. Components MUST use:

- Colors: `--color-bg`, `--color-bg-elevated`, `--color-surface-2`,
  `--color-border`, `--color-border-strong`, `--color-fg`,
  `--color-fg-muted`, `--color-fg-subtle`, `--color-accent`,
  `--color-accent-fg`, `--color-accent-muted`, `--color-good`,
  `--color-warn`, `--color-danger`.
- Type: `--font-sans` (Geist Variable), `--font-mono` (Geist Mono Variable).
- Sizes: `--text-xs` … `--text-3xl` (1.25 ratio).

Magic Tailwind colors (`bg-slate-*`, `text-gray-*`, `border-zinc-*`)
are bug bait — never reach for them. If you need a new shade, add a
token first, then use it.

---

## Why no Storybook

Four primitives + four composed components don't need a 200 MB
dependency to demo. The actual app surfaces (`/login`, `/home`,
`/modules/:id`, `/modules/:id/lesson/:sphereId`) are a faster preview
than a Storybook stage with synthetic props. Revisit at MVP-2 if the
component count grows past ~20 or external contributors land.
