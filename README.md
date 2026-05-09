# PyPrep

> **Active recall + spaced repetition + in-browser code execution + free mock interviews — purpose-built for Israeli junior Python interviews.**

PyPrep is a focused web app that takes a CS graduate from "I can build with AI" to "I can pass a Python live-coding interview" in 4–6 weeks of daily use. It is not a tutorial, not a Duolingo clone, not a LeetCode replacement.

---

## What's inside

- 📚 **Lessons** — curated topical content covering Python core, automation/scripting, testing, Linux/Docker/SQL/Git.
- 🎴 **Five card types** — flip cards, code traps ("what does this print?"), multiple choice with non-obvious answers, fill-in-the-blank, and full code tasks.
- 💻 **In-browser code execution** — solve real coding problems with hidden `pytest` validation, all inside Pyodide. No server-side code execution. No security risk. No signup gate to run code.
- 🧠 **FSRS spaced repetition** — modern memory model, schedules each card to resurface right before you'd forget.
- 📊 **Honest weakness dashboard** — ranks topics by where you actually struggle. No streak shaming.
- 🎯 **Mock interview prompt generator** — copies a high-quality interviewer prompt to your clipboard. Paste into Claude.ai or ChatGPT. No paid API calls, no rate limits, unlimited mock interviews.

---

## Status

**Pre-MVP.** Architecture & docs frozen, content & code being implemented. See `docs/TODO.md` for live progress.

---

## Quick Start (local dev)

### Prerequisites

- Python 3.11+
- Node 20+ and pnpm 9+
- `uv` (Astral's Python package manager) — install: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Docker + Docker Compose (optional, for one-command dev)

### Install & run

```bash
# 1. clone and enter
git clone https://github.com/<you>/pyprep.git
cd pyprep

# 2. backend
uv sync                              # install all Python deps from pyproject.toml + uv.lock
cp .env-example .env                 # adjust if needed

# 3. frontend
cd frontend && pnpm install && cd ..

# 4. run both
docker compose up                    # OR run uv run pyprep-api and pnpm --dir frontend dev separately
```

Open `http://localhost:5173`. Default single-user mode is enabled — no registration screen.

> **Database migrations run automatically on app startup.** No manual
> `alembic upgrade head` is needed for dev or prod — the FastAPI lifespan
> hook brings the schema to head every boot (idempotent). See
> `src/pyprep/api/lifespan.py` and `PLAN.md` ADR-012.

---

## Configuration

All settings via environment variables. See `.env-example` for the full list. Highlights:

| Variable | Default | Effect |
|---|---|---|
| `PYPREP_SINGLE_USER` | `true` | Skip registration; auto-login as the configured user |
| `PYPREP_DATABASE_URL` | `sqlite:///./pyprep.db` | DB connection string |
| `PYPREP_JWT_SECRET` | _required_ | JWT signing secret |
| `PYPREP_FSRS_REQUEST_RETENTION` | `0.9` | Target retrievability for next review |
| `PYPREP_DAILY_NEW_CARD_CAP` | `15` | Max new cards introduced per day |

---

## Usage

### Daily flow (recommended)

1. Open the app. Home shows today's review queue (FSRS-scheduled) and your top 3 weakness topics.
2. Hit **Review now** — work through due cards (~10–20 mins).
3. If the queue is short, follow a **weakness topic** link — practice that sphere.
4. Once a week, hit **Mock Interview** — generate a prompt, paste into Claude/ChatGPT, run a 30-min mock.

### Card session

- **Space** — flip / reveal answer.
- **1 / 2 / 3 / 4** — rate `Again` / `Hard` / `Good` / `Easy` (FSRS rating).
- **Enter** — next card.

### Mock interview

1. Go to **Mock**.
2. Pick modules / spheres / difficulty / count, OR pick a curated pack.
3. Click **Generate**. The prompt appears.
4. **Copy to clipboard**.
5. Open Claude.ai or ChatGPT, paste, hit send. The LLM becomes your interviewer.

---

## Architecture (one diagram)

```
   Browser                     Backend                Storage
   ────────                    ────────               ───────
   ┌────────────┐  HTTPS       ┌───────────────┐      ┌─────────┐
   │  React SPA │ ───────────► │  FastAPI API  │────► │ SQLite  │
   │  + Pyodide │              │  + Core SDK   │      │ /Postgres│
   └────────────┘              └───────────────┘      └─────────┘
        │                              │
        │                              ▼
        │                       ┌───────────────┐
        │                       │  content/     │
        │                       │  Markdown +   │
        │                       │  JSON cards   │
        └─ runs Python code ────┘               
           in Web Worker
```

Full architecture: `docs/PLAN.md` (C4 diagrams, ADRs).

---

## Development

```bash
# run tests
uv run pytest --cov                  # coverage gate ≥ 85%

# lint & format
uv run ruff check .
uv run ruff format .

# type-check (strict on SDK)
uv run mypy src/pyprep/sdk/

# validate content
uv run validate-content

# enforce 150 LOC file rule
python scripts/check_file_size.py
```

A pre-commit hook runs all of the above on staged files.

---

## Project Documentation

This project follows [Dr. Yoram Segal's Software Project Guidelines v3.00](./SOFTWARE_PROJECT_GUIDELINES.md) (also referenced from the project root). All design decisions are captured before code.

| Doc | Purpose |
|---|---|
| `docs/PRD.md` | What we're building, for whom, why, KPIs |
| `docs/PLAN.md` | How — C4 diagrams, ADRs, data model |
| `docs/TODO.md` | Phased task list, current status |
| `docs/PRD_spaced_repetition.md` | FSRS algorithm spec |
| `docs/PRD_code_sandbox.md` | Pyodide execution spec |
| `docs/PRD_progress_tracking.md` | Stats & weakness detection |
| `docs/PRD_mock_interview_prompts.md` | Mock-interview prompt generator |
| `docs/PRD_content_authoring.md` | Content schema & authoring rules |
| `docs/CLAUDE_CODE_INSTRUCTIONS.md` | How AI agents should drive this repo |

---

## Contributing

Single contributor at MVP (the project owner). Public contribution post-launch.

If you're an AI agent (Claude Code, Cursor, etc.): read `docs/CLAUDE_CODE_INSTRUCTIONS.md` first. It is binding.

---

## License

MIT — see `LICENSE`.

## Credits

- [Pyodide](https://pyodide.org/) — Python in WebAssembly.
- [py-fsrs](https://github.com/open-spaced-repetition/py-fsrs) — FSRS algorithm reference implementation.
- [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), [Tailwind](https://tailwindcss.com/), [TanStack](https://tanstack.com/).
- Curriculum source: project owner's interview-prep notes (Modules 1–4).
