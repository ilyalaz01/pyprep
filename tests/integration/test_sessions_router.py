"""T3.4 — /api/sessions/* router.

Owner-review focus is `idempotency_key` over HTTP — see N021. These tests
pin the body-field shape, dedup semantics, and finish-byte-equality.
"""

from __future__ import annotations

import httpx
import pytest

PASSWORD = "hunter2!extra"
GOOD_KEY = "k-" + "0" * 30  # 32 chars, alphanumeric+`-`


async def _register_and_login(client: httpx.AsyncClient, email: str) -> str:
    await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    r = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    return r.json()["access_token"]


async def _start_session(client: httpx.AsyncClient, token: str) -> dict:
    r = await client.post(
        "/api/sessions",
        json={"mode": "learn", "sphere_id": "m1-s0", "limit": 3},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201, r.text
    return r.json()


# --- start ----------------------------------------------------------------


@pytest.mark.asyncio
async def test_start_requires_auth(client: httpx.AsyncClient) -> None:
    r = await client.post("/api/sessions", json={"mode": "learn", "sphere_id": "m1-s0"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_start_returns_session_with_queue(client: httpx.AsyncClient) -> None:
    token = await _register_and_login(client, "start@example.com")
    s = await _start_session(client, token)
    assert "id" in s and len(s["id"]) > 0
    assert s["mode"] == "learn"
    assert isinstance(s["queue"], list) and len(s["queue"]) > 0
    assert s["cards_total"] == len(s["queue"])
    assert s["ended_at"] is None


@pytest.mark.asyncio
async def test_start_learn_without_sphere_id_returns_422(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "nosphere@example.com")
    r = await client.post(
        "/api/sessions",
        json={"mode": "learn"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_start_mixed_zero_history_yields_new_cards_and_total_count(
    client: httpx.AsyncClient,
) -> None:
    """T5.10 fix: a fresh user with zero Reviews against a real sphere
    must get a non-empty queue under mode='mixed' (review-due is empty,
    so mixed falls back to new cards up to daily_new_card_cap). The
    response also carries total_cards_in_sphere so the SPA can tell
    "no cards yet" from "caught up for today" when the queue IS empty."""
    token = await _register_and_login(client, "freshmixed@example.com")
    r = await client.post(
        "/api/sessions",
        json={"mode": "mixed", "sphere_id": "m1-s0", "limit": 20},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["mode"] == "mixed"
    assert isinstance(body["queue"], list)
    assert len(body["queue"]) > 0, "mixed mode against zero history must yield new cards"
    assert body["total_cards_in_sphere"] is not None
    assert body["total_cards_in_sphere"] >= len(body["queue"])
    assert body["cards_total"] == len(body["queue"])


@pytest.mark.asyncio
async def test_start_review_without_sphere_omits_total_cards_in_sphere(
    client: httpx.AsyncClient,
) -> None:
    """When sphere_id is absent (global review mode), total_cards_in_sphere
    is null — the field is sphere-scoped by definition."""
    token = await _register_and_login(client, "globalreview@example.com")
    r = await client.post(
        "/api/sessions",
        json={"mode": "review"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["total_cards_in_sphere"] is None


# --- next -----------------------------------------------------------------


@pytest.mark.asyncio
async def test_next_returns_first_queue_card_with_content(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "next@example.com")
    s = await _start_session(client, token)
    r = await client.get(
        f"/api/sessions/{s['id']}/next",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["card_id"] == s["queue"][0]
    assert body["type"] in {"flip", "code_trap", "multiple_choice", "fill_in", "code_task"}
    assert "raw" in body and isinstance(body["raw"], dict)


@pytest.mark.asyncio
async def test_next_after_param_returns_following_card(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "after@example.com")
    s = await _start_session(client, token)
    r = await client.get(
        f"/api/sessions/{s['id']}/next",
        params={"after": s["queue"][0]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["card_id"] == s["queue"][1]


@pytest.mark.asyncio
async def test_next_at_end_of_queue_returns_404(client: httpx.AsyncClient) -> None:
    token = await _register_and_login(client, "end@example.com")
    s = await _start_session(client, token)
    r = await client.get(
        f"/api/sessions/{s['id']}/next",
        params={"after": s["queue"][-1]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_next_with_unknown_after_returns_404_not_500(
    client: httpx.AsyncClient,
) -> None:
    """T3.5.2 — `?after=<card_id_not_in_queue>` previously raised
    `ValueError` from `queue.index(after)` → 500. Must be 404."""
    token = await _register_and_login(client, "unknownafter@example.com")
    s = await _start_session(client, token)
    r = await client.get(
        f"/api/sessions/{s['id']}/next",
        params={"after": "not-a-real-card-id-zzz"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"


@pytest.mark.asyncio
async def test_next_for_other_users_session_returns_404(
    client: httpx.AsyncClient,
) -> None:
    """N021.3 — cross-user access is 404, not 403 (no enumeration leak)."""
    a_token = await _register_and_login(client, "alice@example.com")
    s = await _start_session(client, a_token)
    b_token = await _register_and_login(client, "bob@example.com")
    r = await client.get(
        f"/api/sessions/{s['id']}/next",
        headers={"Authorization": f"Bearer {b_token}"},
    )
    assert r.status_code == 404


# --- answer ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_answer_records_review_and_returns_next_state(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "answer@example.com")
    s = await _start_session(client, token)
    r = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={"card_id": s["queue"][0], "rating": 3, "response_ms": 1500},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "next_due_at" in body
    assert body["new_state"] in {"learning", "review", "relearning"}


@pytest.mark.asyncio
async def test_answer_idempotency_key_same_card_returns_first_result(
    client: httpx.AsyncClient,
) -> None:
    """N021.1 — same key + same (session, card) → silent dedup. The second
    submission's rating is ignored; first write wins."""
    token = await _register_and_login(client, "idem@example.com")
    s = await _start_session(client, token)
    card_id = s["queue"][0]

    r1 = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={
            "card_id": card_id,
            "rating": 3,  # Good
            "response_ms": 1500,
            "idempotency_key": GOOD_KEY,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    r2 = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={
            "card_id": card_id,
            "rating": 1,  # Again — DIFFERENT rating
            "response_ms": 9999,
            "idempotency_key": GOOD_KEY,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Body byte-equal — second submission's rating did NOT win.
    assert r1.json() == r2.json()


@pytest.mark.asyncio
async def test_answer_idempotency_key_different_card_not_deduped(
    client: httpx.AsyncClient,
) -> None:
    """N021.1 — key is scoped per (session, card). Same key on a different
    card is a fresh submission, NOT a dedup hit."""
    token = await _register_and_login(client, "scope@example.com")
    s = await _start_session(client, token)

    r1 = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={
            "card_id": s["queue"][0],
            "rating": 3,
            "response_ms": 1000,
            "idempotency_key": GOOD_KEY,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    r2 = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={
            "card_id": s["queue"][1],
            "rating": 3,
            "response_ms": 1000,
            "idempotency_key": GOOD_KEY,  # same key, different card
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Distinct submissions → different next_state stability evolution
    # (or at minimum, both succeed independently without 409).


@pytest.mark.asyncio
async def test_answer_idempotency_key_too_short_returns_422(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "short@example.com")
    s = await _start_session(client, token)
    r = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={
            "card_id": s["queue"][0],
            "rating": 3,
            "response_ms": 1500,
            "idempotency_key": "tooshort",  # 8 chars < min 16
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_answer_idempotency_key_bad_chars_returns_422(
    client: httpx.AsyncClient,
) -> None:
    token = await _register_and_login(client, "badchars@example.com")
    s = await _start_session(client, token)
    r = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={
            "card_id": s["queue"][0],
            "rating": 3,
            "response_ms": 1500,
            "idempotency_key": "k-" + "/" * 30,  # forward slash not in pattern
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_answer_response_ms_above_cap_returns_422(
    client: httpx.AsyncClient,
) -> None:
    """T3.5.3 — response_ms is best-effort client-reported and must be clamped
    at the boundary. >10 minutes (600_000 ms) trips 422 — prevents a clock-skew
    or tampered client from poisoning FSRS scheduling and stats aggregations."""
    token = await _register_and_login(client, "rcap@example.com")
    s = await _start_session(client, token)
    r = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={
            "card_id": s["queue"][0],
            "rating": 3,
            "response_ms": 600_001,  # 1 ms over the cap
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_answer_response_ms_at_cap_accepted(
    client: httpx.AsyncClient,
) -> None:
    """Boundary check — exactly 600_000 is accepted."""
    token = await _register_and_login(client, "rcapok@example.com")
    s = await _start_session(client, token)
    r = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={"card_id": s["queue"][0], "rating": 3, "response_ms": 600_000},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_answer_rating_out_of_range_returns_422(client: httpx.AsyncClient) -> None:
    """Rating must be 1..4 (Again, Hard, Good, Easy). Anything else is 422
    at the Pydantic boundary — never reaches the SDK's `Rating(int)` cast,
    which would raise ValueError → 500 without this guard."""
    token = await _register_and_login(client, "rating@example.com")
    s = await _start_session(client, token)
    for bad in (0, 5, -1, 99):
        r = await client.post(
            f"/api/sessions/{s['id']}/answer",
            json={"card_id": s["queue"][0], "rating": bad, "response_ms": 100},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 422, f"rating={bad} should be 422, got {r.status_code}"


@pytest.mark.asyncio
async def test_answer_after_finish_returns_409(client: httpx.AsyncClient) -> None:
    """SessionFinishedError → 409."""
    token = await _register_and_login(client, "afterfinish@example.com")
    s = await _start_session(client, token)
    await client.post(
        f"/api/sessions/{s['id']}/finish",
        headers={"Authorization": f"Bearer {token}"},
    )
    r = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={"card_id": s["queue"][0], "rating": 3, "response_ms": 100},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_answer_for_other_users_session_returns_404(
    client: httpx.AsyncClient,
) -> None:
    a_token = await _register_and_login(client, "owner@example.com")
    s = await _start_session(client, a_token)
    b_token = await _register_and_login(client, "thief@example.com")
    r = await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={"card_id": s["queue"][0], "rating": 3, "response_ms": 100},
        headers={"Authorization": f"Bearer {b_token}"},
    )
    assert r.status_code == 404


# --- finish ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_finish_returns_summary(client: httpx.AsyncClient) -> None:
    token = await _register_and_login(client, "fin@example.com")
    s = await _start_session(client, token)
    await client.post(
        f"/api/sessions/{s['id']}/answer",
        json={"card_id": s["queue"][0], "rating": 3, "response_ms": 100},
        headers={"Authorization": f"Bearer {token}"},
    )
    r = await client.post(
        f"/api/sessions/{s['id']}/finish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["cards_total"] == s["cards_total"]
    assert body["cards_correct"] >= 1
    assert "retention" in body


@pytest.mark.asyncio
async def test_finish_is_idempotent_byte_equal_on_second_call(
    client: httpx.AsyncClient,
) -> None:
    """N022 — second `/finish` returns the same body byte-for-byte. Critical
    for safe SPA retries on flaky networks."""
    token = await _register_and_login(client, "reload@example.com")
    s = await _start_session(client, token)
    headers = {"Authorization": f"Bearer {token}"}
    r1 = await client.post(f"/api/sessions/{s['id']}/finish", headers=headers)
    r2 = await client.post(f"/api/sessions/{s['id']}/finish", headers=headers)
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json() == r2.json()


@pytest.mark.asyncio
async def test_finish_for_other_users_session_returns_404(
    client: httpx.AsyncClient,
) -> None:
    a_token = await _register_and_login(client, "fa@example.com")
    s = await _start_session(client, a_token)
    b_token = await _register_and_login(client, "fb@example.com")
    r = await client.post(
        f"/api/sessions/{s['id']}/finish",
        headers={"Authorization": f"Bearer {b_token}"},
    )
    assert r.status_code == 404
