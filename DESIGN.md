---
name: PyPrep
description: A focused Python interview prep platform for Israeli CS graduates — calm, honest, technically dense.
colors:
  bg: "oklch(0.18 0.006 80)"
  bg-elevated: "oklch(0.22 0.006 80)"
  surface-2: "oklch(0.26 0.006 80)"
  border: "oklch(0.32 0.006 80)"
  border-strong: "oklch(0.42 0.006 80)"
  fg: "oklch(0.94 0.005 80)"
  fg-muted: "oklch(0.74 0.005 80)"
  fg-subtle: "oklch(0.62 0.005 80)"
  accent: "oklch(0.78 0.13 70)"
  accent-fg: "oklch(0.18 0.006 80)"
  accent-muted: "oklch(0.55 0.06 70)"
  good: "oklch(0.78 0.14 145)"
  warn: "oklch(0.82 0.14 80)"
  danger: "oklch(0.65 0.18 25)"
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  prose:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.3
  caption:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  inline: "3px"
  default: "4px"
  block: "6px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  base: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.default}"
    padding: "0 1rem"
    height: "2.25rem"
  button-secondary:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.fg}"
    rounded: "{rounded.default}"
    padding: "0 1rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.default}"
    padding: "0 1rem"
    height: "2.25rem"
  input:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.fg}"
    rounded: "{rounded.default}"
    padding: "0 0.75rem"
    height: "2.25rem"
  banner-info:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.fg}"
    rounded: "{rounded.default}"
    padding: "0.5rem 0.75rem"
  banner-error:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.fg}"
    rounded: "{rounded.default}"
    padding: "0.5rem 0.75rem"
  banner-success:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.fg}"
    rounded: "{rounded.default}"
    padding: "0.5rem 0.75rem"
  topbar:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.fg}"
    height: "3.5rem"
    padding: "0 1.5rem"
---

# Design System: PyPrep

## 1. Overview

**Creative North Star: "The Peer's Notebook"**

PyPrep is the surface a senior engineer would actually keep open while studying. Its job is to disappear into the task, read this lesson, run this card session, see what's weak, without theatre, without congratulating the user for showing up, and without hiding the score behind motivational chrome. The voice is declarative, not exclamatory; specific, not motivational. The tonal lane runs Linear (calm density, restraint), Anthropic Console (technical authority without flourish), Vercel docs (information-dense, opinionated typography). It explicitly rejects the entire Duolingo / Udemy / generic-AI-SaaS axis: no streak guilt, no anthropomorphic mascot, no confetti, no purple/blue gradient hero, no rounded-icon-tile-above-heading, no glassmorphism, no nested cards, no bouncy easings on interactive elements.

The audience reads documentation for a living. They will recognize Inter on contact and clock the system as "yet another SaaS"; they will flinch at neon and at progress rings that pretend to mean something. So the system commits the other direction: a warm-tinted (hue 80°, toward amber) OKLCH neutral palette that pulls the dark base away from the cool-blue tech-dashboard reflex; Geist Sans + Geist Mono as the only typefaces; flat surfaces with hairline borders for separation, never shadows; one ochre accent that earns ≤10% of any screen; no decorative motion at all, every transition is 120ms ease-out-quart on state, never on layout. Empty space is a tool. Information density is respect for the reader.

Honest signaling is the operating principle. The user sees a 60% retention number, not a "you're doing great!" toast. Streaks reset silently. The weakness section is hidden until there are ≥10 reviews to back it because a premature ranking is worse than no ranking. The client is the source of truth for the loop (queue progression, Pyodide pass/fail); the server records the truth. The UI must read like its truth is local; latency-hiding is a feature, not a side effect.

**Key Characteristics:**
- Restrained color strategy (tinted neutrals + one ochre accent ≤10%)
- Dark by default; light variant only via `prefers-color-scheme`
- Geist Sans + Geist Mono only (no Inter, no display fonts in UI labels)
- Flat surfaces; depth via hairline borders and tonal layering, never shadows
- Motion is functional only: 120ms ease-out-quart on state, zero on layout
- WCAG 2.1 AA target with a CI gate (`scripts/check-contrast.mjs`)
- One screen, one task (no kitchen-sink dashboards)
- Test coverage on shipped tokens (Tailwind classnames pinned by tests so refactors can't quietly drift)

## 2. Colors: The Warm-Graphite Palette

Tinted neutrals carry ≥90% of every surface. The accent earns the remaining 10%. State colors appear only on outcome moments (rating buttons, due-card badges, test pass/fail), never decoratively. All values are OKLCH; the project uses OKLCH directly in the frontmatter as the canonical reference (Stitch's hex linter warning is intentional — chroma in Display-P3 doesn't round-trip cleanly through sRGB). The light variant flips lightness, holds hue and chroma constant, and exists for the rare sunlit-balcony / shared-screen / bug-report-screenshot case; it is not the demo screenshot.

### Primary
- **Studio Ochre** (`oklch(0.78 0.13 70)`): the only saturated color in the system at rest. Lives on the primary CTA (Sign in, Start review session), the lesson-reader hyperlink color, and selection states. Never used as a background fill on more than one element per screen.
- **On-Ochre Charcoal** (`oklch(0.18 0.006 80)`): text color when sitting on Studio Ochre. Tonally identical to the page background, so the CTA reads like a "lit panel" against the surface, not a candy button.

### Secondary (state colors, used only on outcome moments)
- **Pass Green** (`oklch(0.78 0.14 145)`): correct answer, test-passed, sphere mastered. Never decorative.
- **Hold Amber** (`oklch(0.82 0.14 80)`): hard rating, due-soon badge. Same hue family as the accent so the system reads as one palette, not two.
- **Fail Coral** (`oklch(0.65 0.18 25)`): wrong answer, validation error, banner-error border + glyph color.

### Tertiary
- **Quiet Ochre** (`oklch(0.55 0.06 70)`): the desaturated form of Studio Ochre. Used exclusively as the blockquote left rule in the lesson reader. Saturated enough to register as deliberate, muted enough not to compete with code.

### Neutral (the warm-graphite ramp; dark mode is canonical)
- **Page Background** (`oklch(0.18 0.006 80)`): the deepest tint. Body bg.
- **Elevated Surface** (`oklch(0.22 0.006 80)`): TopBar, code-block backgrounds, banners, inputs. The "second neutral layer" the product reference asks for.
- **Inset Surface** (`oklch(0.26 0.006 80)`): row-hover background, panel-on-panel inset. Rarely used; most lists hover via color shift, not background swap.
- **Hairline** (`oklch(0.32 0.006 80)`): default border. 1px, no exceptions.
- **Strong Hairline** (`oklch(0.42 0.006 80)`): focus ring, active border. Same family, one step up.
- **Foreground** (`oklch(0.94 0.005 80)`): primary text. 15.77:1 against bg.
- **Muted Foreground** (`oklch(0.74 0.005 80)`): secondary text, captions in body. 8.15:1 against bg.
- **Subtle Foreground** (`oklch(0.62 0.005 80)`): tertiary text, eyebrow labels, placeholders. Dark mode 5.16:1 against bg / 4.75:1 against bg-elevated; light mode 5.66:1 / 5.19:1. All four pairings clear WCAG AA per `scripts/check-contrast.mjs` (T4.5.1).

### Named Rules
**The One-Tenth Rule.** Studio Ochre is allowed on ≤10% of any screen. If two saturated elements compete, one is wrong. The only time accent-on-accent appears is the primary CTA's text-on-fill. Decorative accent backgrounds are forbidden.

**The Color-Is-Never-Sole-Signal Rule.** Every state-color use carries a glyph or label too. Banner variants pair color with `▲` / `✓` / `i` glyphs. Rating buttons (Phase 5+) carry text labels (Again / Hard / Good / Easy) plus keyboard digits 1-4. Due-card badges carry an icon. PRD §4 NFR-A11Y-2 is binding.

**The Cool-Blue Refusal.** No color in the system is in the cool-blue family (hue 200–280). Every neutral tints warm (hue 80°). This is not a category reflex; it is the design's deliberate distance from "AI tool dashboard."

## 3. Typography

**UI / Display / Body Font:** Geist Variable (with `ui-sans-serif, system-ui, sans-serif` fallback)
**Mono Font:** Geist Mono Variable (with `ui-monospace, SF Mono, Menlo, monospace` fallback)

**Character:** Geist's geometry is opinionated without being decorative. It signals "deliberate" against the recognizable Inter / Roboto / SF Pro defaults that dominate the SaaS lane. Geist Mono is co-designed with Geist Sans so headings, labels, and inline `code` share the same metrics, no awkward x-height discontinuity when switching between prose and a Pyodide cell. There is no third typeface; lesson copy is technical, not literary. Loaded self-hosted via `@fontsource-variable/geist`.

### Hierarchy
Hierarchy by weight + size, ratio ≥1.25 between steps. Avoid flat scales.

- **Display** (Geist Sans 600, 1.75rem / 28px, 1.3 line-height, -0.01em tracking): page title (`<h1>`). Login, Home, Module detail, Lesson — one per route.
- **Headline** (Geist Sans 600, 1.375rem / 22px): in-lesson `<h2>`.
- **Title** (Geist Sans 600, 1.125rem / 18px): in-lesson `<h3>`.
- **Body** (Geist Sans 400, 1rem / 16px, 1.5 line-height): default UI body and dashboard text.
- **Prose** (Geist Sans 400, 1rem / 16px, 1.7 line-height): lesson reader body. Looser leading; cap line length at 70ch via `max-w-[680px]` on `.prose`.
- **Label** (Geist Sans 500, 0.875rem / 14px): primary affordance text — buttons, table cells, dashboard list rows.
- **Caption** (Geist Sans 500, 0.75rem / 12px, 0.04em tracking, uppercase on Section eyebrows): meta, timestamps, "MODULE 1" address, breadcrumbs.
- **Mono** (Geist Mono 400, 0.875rem / 14px, 1.55 line-height): inline `code`, code blocks, sphere ID captions, numeric data with tabular-nums.

### Named Rules
**The No-Inter Rule.** Inter is forbidden. The audience would recognize it on contact as the SaaS default. Geist or system stack only.

**The 70ch Reader Rule.** Lesson body is capped at 70 characters per line via `max-w-[680px]` on `.prose`. Code blocks break out to full container width because horizontal-scrolling code is the lesser evil compared to wrapped Python.

**The Address-vs-Label Rule.** Sphere IDs (`m1-s0`) are technical addresses; they appear as Mono-font captions or breadcrumbs only. Lesson titles from frontmatter are the human label and own the `<h1>` slot. Module IDs render as `MODULE 1` (Caption, uppercase) eyebrow above the human module name in `<h1>`. Eyebrow + title never restate each other.

## 4. Elevation

PyPrep is flat. There are zero `box-shadow` declarations in the system. Depth is conveyed by tonal layering, a panel one step lighter than the page (`bg-elevated`), a hairline border (`border`) where two surfaces meet, and a strong hairline (`border-strong`) for focus rings, never by simulated lift. The reasoning: shadows photograph as "polish" only against light backgrounds; on a dark warm-tinted base they read as soot and read as imprecision. Hairlines are crisper.

### Tonal Layers (depth without shadows)
- **Page** at `bg` (`oklch(0.18 0.006 80)`).
- **Panel** at `bg-elevated` (`oklch(0.22 0.006 80)`): TopBar, banners, inputs, code blocks. One step lighter; ~4 ΔL.
- **Inset** at `surface-2` (`oklch(0.26 0.006 80)`): row hover, panel-on-panel; one further step.
- **Borders** at `border` (`oklch(0.32 0.006 80)`): 1px hairline, default separator.
- **Focus / active borders** at `border-strong` (`oklch(0.42 0.006 80)`): same family, brighter.

### Named Rules
**The No-Shadow Rule.** `box-shadow` is forbidden across the system. If you reach for a shadow, you actually want a tonal step or a hairline.

**The Hairline Rule.** Borders are 1px. The only exception is the `.prose blockquote` left rule at 2px, the conventional typographic carve-out, documented at the source. Side-stripe borders >1px on cards, list items, callouts, alerts are forbidden absolutely (impeccable shared "Absolute bans").

**The Hover-By-Tone Rule.** Interactive rows hover by switching to `surface-2`, not by adding a border or shadow. Two tonal steps from page → row-hover; that's enough signal without redrawing the row.

## 5. Components

### Buttons
- **Shape:** rounded corners (4px). Height 36px (`md`) or 28px (`sm`); horizontal padding 16px / 12px.
- **Primary:** Studio Ochre fill, On-Ochre Charcoal text, no border. Hover via `brightness(1.10)`; active via `brightness(0.95)`. Disabled drops opacity to 50%.
- **Secondary:** Elevated Surface fill, Foreground text, 1px Hairline border. Hover swaps the border to Strong Hairline.
- **Ghost:** transparent background, Muted Foreground text. Hover lifts the text to Foreground (no fill change).
- **Focus:** 2px Strong Hairline outline at 2px offset (no fill, no shadow). 120ms ease-out-quart on color/background-color/border-color/filter.
- **LinkButton:** TanStack `<Link>` with the same variants/sizes/classes as Button — for action rows that mix navigation and click handlers (`LessonActions`: primary Button + ghost LinkButton). The two are visually indistinguishable on purpose.

### Inputs (single-line text)
- **Style:** 36px tall, 12px horizontal padding, 4px radius. Elevated Surface fill, 1px Hairline border, Subtle Foreground placeholder.
- **Focus:** 2px Strong Hairline outline at 2px offset (matches Button); border color does not change on focus.
- **Invalid:** border swaps to Fail Coral; outline matches. `aria-invalid="true"` set automatically.
- **Disabled:** opacity 60% (T4.7.1a, bumped from Tailwind's 50% default which read as "broken" rather than "off").
- **Error binding:** `FormField` parent clones the input with `aria-describedby="{id}-error"` when an error is set, so screen readers tie the error to the field on every focus, not just on the alert announcement (T4.5.2).

### FormField (label + input + inline error)
- **Label:** Caption type (12px, 500 weight), Muted Foreground.
- **Error:** small Fail Coral text with a leading `▲` glyph (color-is-never-sole-signal).
- **Hint:** small Subtle Foreground text. Mutually exclusive with error.
- **Spacing:** 6px between label and input, 6px between input and error/hint.

### Banner (full-form-width status message)
- **Variants:** info / error / success. Each carries a glyph (`i` / `▲` / `✓`) AND a colored border AND a colored glyph color, three signals.
- **Roles:** error → `role="alert"`, info/success → `role="status"`.
- **Style:** Elevated Surface fill, 1px colored border (variant-specific), 4px radius, 8px / 12px padding. No icon tile above heading.

### Section (header + content slot)
- **Header type:** Caption (12px, 500 weight, 0.04em tracking, uppercase) in Subtle Foreground. Reads as a Linear-style section label.
- **Content:** flat, no card chrome, no shadow, no border around the section block. Sections separate at the parent level via `space-y-8`; the section header is tight to its content (12px below).
- **Action slot:** right-aligned, optional. Used for "Review now" CTA next to "Today's review queue".

### Cards
PyPrep does not have a Card primitive. Most lists, panels, and forms don't need one. Where bordered visual containment is required, it's achieved via the Elevated Surface fill with a 1px Hairline border, a "panel", and only when the structure genuinely calls for it. **Nested cards are forbidden absolutely** (PRODUCT.md anti-reference list).

### Code Blocks (lesson reader)
- **Highlighting:** Shiki, theme `github-dark-dimmed`, **dark-permanent across themes** (T4.5.7). Geist Mono on warm-dark surface is the lesson reader's identity; light-themeing the code block puts the only "loud" element on the page on a quiet background.
- **Loading fallback:** plain `<pre><code>` with mono font and elevated background, same shape as the highlighted final, no flash of empty content.
- **Scrollbar:** WebKit horizontal scrollbar tamed (T4.7.1b), 8px tall, transparent track, Muted Foreground thumb at 30% opacity via `color-mix`. The bright WebKit default was the loudest pixel on every dark-theme code block.

### TopBar
- **Style:** 56px tall, Elevated Surface background, 1px bottom Hairline.
- **Layout:** left wordmark ("PyPrep"), middle "Single-user mode" caption when applicable, right user email + ghost Sign-out button. Single column, single row. **No sidebar in MVP-1**, chrome stays thin per "one screen, one task."
- **Wordmark:** Title type, font-semibold, tracking-tight. No logo art.

### Lesson row / Sphere row (composed)
- **Shape:** flex row, baseline alignment, 12px vertical padding. Hovering switches background to Inset Surface.
- **Label:** human title from frontmatter (Label type), Foreground.
- **Caption:** sphere_id in Mono Caption, Subtle Foreground, beneath the title.
- **Meta:** card count + lesson availability, right-aligned, Muted Foreground.
- **Trailing arrow:** `→` glyph, `aria-hidden`, Muted Foreground.

## 6. Do's and Don'ts

### Do:
- **Do** use OKLCH directly in tokens; `--color-*` is the only color vocabulary. All variants of all primitives reference tokens, no magic Tailwind colors. Test pinning on Button/LinkButton/Input asserts a `--color-*` reference is present in the className.
- **Do** keep the Studio Ochre accent on ≤10% of any screen. One primary CTA per route, accent on lesson hyperlinks; nothing else.
- **Do** give every state color a co-signal: a glyph, a label, or both. WCAG SC 1.4.1 is binding (PRD §4 NFR-A11Y-2).
- **Do** keep transitions to 120ms on state-only properties (color, background-color, border-color, filter, outline-color). Use the `--ease-out-quart` token (`cubic-bezier(0.16, 1, 0.3, 1)`). Pinned by tests on Button/LinkButton/Input.
- **Do** show an inline visible note next to disabled buttons that have a reason. `title=` tooltips are invisible to keyboard- and touch-only users.
- **Do** wire `aria-describedby` from inputs to their error/hint text via `FormField`. Screen readers must tie the error to the field, not just to the alert region.
- **Do** test-pin every shipped Tailwind classname that encodes a design choice (`disabled:opacity-60`, `ease-(--ease-out-quart)`, variant token references). A future Tailwind upgrade or a casual sweep cannot silently drift the design.
- **Do** keep the lesson reader at `max-w-[680px]` (≈70ch). Code blocks may break out to the parent container; prose may not.
- **Do** use TanStack `<Link>` / `<LinkButton>` / `useNavigate` for in-app navigation. `window.location.href = ...` is forbidden in `pages/` and `components/` and is enforced by ESLint `no-restricted-syntax`. Two grandfathered Phase-5 sites carry an explicit `// TODO(phase-5)` + `eslint-disable-next-line` directive.
- **Do** render the human lesson title from frontmatter (`lesson_title`) as the row label and put `sphere_id` underneath in Mono Caption. Sphere IDs are technical addresses, not human labels (T4.5.6).

### Don't:
- **Don't** use Inter or any other ubiquitous SaaS sans. Geist Sans + Geist Mono only.
- **Don't** use `box-shadow` anywhere. Depth is tonal and via hairlines, not via simulated lift. (Anti-reference: SaaS dashboard polish.)
- **Don't** use side-stripe borders greater than 1px as colored accents on cards, list items, callouts, or alerts. The blockquote 2px left rule is the only carve-out and is documented at the source.
- **Don't** nest cards inside cards. Re-read forbidden patterns before proposing any layout that uses background-on-background-on-background depth.
- **Don't** use rounded-square icon tiles above headings. Anti-reference list.
- **Don't** use bouncy / spring easings on interactive elements. ease-out-quart only.
- **Don't** use fake glassmorphism (`backdrop-filter: blur` on translucent panels for no functional reason). Anti-reference list.
- **Don't** put purple or blue gradient hero / banner / accent backgrounds anywhere. Anti-reference list. The accent is Studio Ochre, hue 70°, used at ≤10%.
- **Don't** use em dashes (U+2014) in user-facing copy. Use commas, colons, semicolons, periods, or parentheses. Enforced by `scripts/check-em-dash.mjs`.
- **Don't** ship streak-loss guilt UI of any kind. PRD §3.5 FR-STATS-4 is binding. Streaks reset silently. Wrong answers get an explanation, not a sad face.
- **Don't** use emoji in app navigation or chrome. Lesson content (markdown body) may include emoji; the app shell may not. Anti-reference list.
- **Don't** ship light-mode contrast below WCAG AA (4.5:1 for normal text). `scripts/check-contrast.mjs` runs in CI and fails the build on any drop.
- **Don't** restate the heading. The eyebrow ("MODULE 1") is the address; the `<h1>` is the human label. They never read the same.
- **Don't** use `window.location.href = ...` for in-app navigation. Use the router. ESLint forbids it in `pages/` and `components/`.
- **Don't** use `title=` tooltips as the only explanation for a disabled control. Render a visible inline note.
- **Don't** rely on color alone for any state. Color + glyph or color + label, always.
