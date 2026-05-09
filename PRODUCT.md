# Product

## Register

product

## Users

Israeli CS / Software Engineering graduates and final-year students, age 22-28. Technical readers, fluent in Hebrew, Russian, and English (the owner Ilya defaults to Russian). Currently job-searching for a junior Python position — backend, automation, AI integration, or QA automation. They have degree-level CS knowledge but weak interview muscle: they can build features by directing LLMs, but cannot write working Python from a blank page from memory. They use PyPrep on a desktop in 30–90 minute focused sessions, daily. Mobile is explicitly out of scope (PRD §5).

## Product Purpose

PyPrep takes a candidate from "I broadly understand Python" to "I can pass a junior-to-mid Python technical interview" in 4–6 weeks of focused daily use. It is not a tutorial site, not a Duolingo clone, not a LeetCode replacement. It is a focused Python interview prep platform built on four pillars: curated topical content mapped to Israeli junior interview content, active recall via flip cards and code traps with FSRS spaced repetition, in-browser interactive code tasks validated by `pytest` via Pyodide, and a mock interview prompt generator for use with the user's own Claude/ChatGPT subscription. Success looks like: the owner passes a real Python interview within 8 weeks of consistent daily use, and another CS student can register and use the deployed app without owner intervention.

## Brand Personality

Serious, no-nonsense, calm. Treats the user as a peer-in-training, not a student to be motivated. Anti-Duolingo: no streak shaming, no celebratory popups, no anthropomorphic mascot, no confetti animations. Honest about weaknesses without being demoralizing — "you got 60% on closures this week" is fine; "you broke your streak 😢" is not. Reference apps in the right lane: Linear (calm density, restraint), Anthropic Console (technical authority without flourish), Vercel docs (information-dense, opinionated typography). Voice: declarative, not exclamatory; specific, not motivational.

## Anti-references

Explicitly NOT: Duolingo, Udemy, freeCodeCamp, generic AI-generated SaaS dashboards. Forbidden patterns enumerated:

- Purple or blue gradient headers / hero sections
- Inter as the single font for everything
- Cards-nested-in-cards visual stacking
- "Rounded-square icon tile above heading" pattern
- Bouncy / spring easings on interactive elements
- Fake glassmorphism (backdrop-blur on translucent panels for no functional reason)
- Generic "Hero + Features + CTA" landing layout (PyPrep has no marketing surface)
- Emoji in UI chrome (code content can include emoji; app navigation cannot)
- Streak-loss guilt UI of any kind (PRD §3.5 FR-STATS-4 is binding)

## Design Principles

1. **Honest signaling over motivational theatre.** Show weakness without shaming. Streak resets silently. Wrong answers get a real explanation, not a sad-face. The user is here to pass an interview, not to feel good about today.
2. **Density that respects technical readers.** This audience reads documentation for a living. Information-dense layouts, monospace where it carries meaning, minimal hand-holding. Empty space is a tool, not a default.
3. **One screen, one task.** Each route maps to one job: read a lesson, run a card session, view stats. No kitchen-sink dashboards combining four widgets that don't share intent.
4. **Client owns the loop, server records the truth.** ADR-010: the SPA is the source of truth for queue progression and Pyodide pass/fail; the server is the event sink. The UI must read like its truth is local; latency-hiding is a feature.
5. **Pyodide-only execution, no exceptions.** ADR-001 is binding — no server-side `exec` of user code under any condition. Renderer authors MUST mask answer-bearing fields (`tests`, `solution_code`, `correct_index`, flip-card backs); the wire delivers them but the UI hides them. See `PRD_code_sandbox.md` §3.1.

## Accessibility & Inclusion

WCAG 2.1 AA target (PRD §4 NFR-A11Y-1). All flows keyboard-navigable; ARIA labels on cards and rating controls. Color is never the sole signal for state — wrong/correct/due-now must carry an icon or label too. UI strings are extractable for future RU/HE localization (PRD §4 NFR-I18N-1) — no hardcoded user-facing English in components. RTL readiness is a structural concern even pre-Hebrew launch: avoid layouts that break under `dir="rtl"`. Reduced-motion users: respect `prefers-reduced-motion`; the app already avoids bouncy easings (anti-reference list), so this is mostly enforcement of "no motion that isn't load-bearing."
