---
module_id: 4
sphere_id: "m4-s0"
title: "Networking Fundamentals"
title_ru: "Сетевые основы"
estimated_minutes: 13
prerequisites: []
tags: ["networking", "tcp", "udp", "dns", "http", "status-codes", "interview-classic"]
---

# Networking Fundamentals

Networking is the bottom-layer screen at every backend / automation / QA interview in Israel. The questions are predictable — common ports, TCP vs UDP, walk-me-through-google.com, 401 vs 403 — and hesitation on any of them marks you down before the Python conversation starts. Depth is shallow; breadth is the bar.

## Why this matters in interviews

The interviewer is checking whether you've ever read an `nginx` access log, debugged a 401, or noticed your service was binding to `0.0.0.0` vs `127.0.0.1`. Five minutes of conversation reveals it.

---

## Concept 1 — IP, ports, localhost

An IP identifies a host; a port identifies a service on that host. `host:port` is what a client connects to.

Common ports worth memorizing:

| Port | Service |
|---|---|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS (HTTP + TLS) |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 8000 / 8080 / 3000 | dev / local servers |
| 27017 | MongoDB |

`localhost` is `127.0.0.1` (IPv4) / `::1` (IPv6) — the loopback address. **`127.0.0.1` binds to the loopback interface only** (other machines can't reach it); **`0.0.0.0` binds to every interface** (the service is reachable from outside, including the public network). Dev servers default to `127.0.0.1` for safety; production services bind to `0.0.0.0`.

Private IP ranges (RFC 1918, not routable publicly): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Ports below 1024 are "well-known" and on Linux require root or `CAP_NET_BIND_SERVICE` to bind.

---

## Concept 2 — TCP vs UDP

Both run on top of IP. They make different trade-offs:

- **TCP** — connection-oriented (three-way handshake: SYN / SYN-ACK / ACK), ordered delivery, retransmission on loss, flow control. Slower, more overhead, more reliable.
- **UDP** — connectionless, fire-and-forget, no ordering, no retransmission, no flow control. Faster, less overhead, less reliable.

Split: correctness vs latency. HTTP runs over TCP because the browser needs HTML / JSON intact and ordered. Video streaming, online games, DNS, VoIP often use UDP — losing one frame beats waiting for retransmission and stalling the whole stream.

Interview question: **why does HTTP use TCP, not UDP?** Ordered, complete delivery — you can't render a half-arrived HTML page. (HTTP/3 changed this via QUIC on UDP, but that's a more senior conversation.)

---

## Concept 3 — DNS + HTTP anatomy

DNS resolves a name (`google.com`) to an IP (`142.250.180.46`). The lookup walks a chain:

```
browser cache → OS resolver cache → ISP/configured DNS → root → TLD (.com) → authoritative (google.com)
```

Each layer caches with a TTL; most lookups never reach the authoritative server.

An HTTP request has these parts:

```
POST /api/users HTTP/1.1       ← request line: method + path + version
Host: api.example.com           ← headers
Content-Type: application/json
Authorization: Bearer eyJ...

{"name": "alice"}               ← body (optional)
```

The response has the same shape with a status line at the top (`HTTP/1.1 201 Created`) instead of the request line. Methods to know cold: `GET` (idempotent, no body), `POST` (creates, has body), `PUT` (replaces, idempotent), `PATCH` (partial update, *not* idempotent), `DELETE` (idempotent), `HEAD` (GET without body).

---

## Concept 4 — Status codes

Four families:

- **2xx Success**: 200 OK, 201 Created, 204 No Content.
- **3xx Redirect**: 301 Moved Permanently, 302 Found (temporary), 304 Not Modified (cache hit).
- **4xx Client error**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 429 Too Many Requests.
- **5xx Server error**: 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.

The interview classic: **401 vs 403**. **401 = "who are you?"** — auth missing, malformed, or invalid. **403 = "I know who you are, you can't do this"** — auth succeeded, but the identity lacks permission. Getting this backward marks juniors fastest.

---

## Quick check before you run cards

1. Default ports for SSH, HTTPS, PostgreSQL, Redis?
2. What's the difference between binding to `127.0.0.1` and `0.0.0.0`?
3. Why does HTTP use TCP and not UDP?
4. Walk a DNS lookup from browser address bar to authoritative server.
5. 401 vs 403 — one-sentence each.

If any feels shaky — re-read that section, then start the cards.
