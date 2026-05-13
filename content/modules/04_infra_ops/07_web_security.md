---
module_id: 4
sphere_id: "m4-s7"
title: "Web Security Basics"
title_ru: "Основы веб-безопасности"
estimated_minutes: 16
prerequisites: ["m4-s4"]
tags: ["security", "sql-injection", "hashing", "jwt", "oauth", "cors", "https", "interview-classic"]
---

# Web Security Basics

Junior backend / automation roles in Israeli hi-tech get asked security basics surprisingly often — probably 30–40% of student technical screens include at least one security question, and the classic ones have wrong answers that immediately disqualify the candidate. This sphere isn't a comprehensive security course; it's the floor of "you won't say something embarrassing when asked about passwords, SQL injection, JWT, OAuth, CORS, or HTTPS in a 45-minute screen." Six high-leverage topics, each with a canonical wrong answer that ends the conversation.

## Why this matters in interviews

The probes are predictable: "how would you store user passwords?" (`bcrypt` or `argon2` with a per-password salt — and "salting is the *defense the library handles for you*"; never plaintext, never MD5). "How do you prevent SQL injection?" (parametrized queries — the DB driver sends template and values separately; not string escaping). "What's in a JWT?" (`header.payload.signature`, base64-encoded, signed but **not** encrypted — anyone with the token can read the payload). "What happens when you click 'Sign in with Google'?" (OAuth 2.0 authorization-code flow — your app gets delegated permission, never the password). "What does a CORS error mean?" (the server didn't return the right `Access-Control-Allow-*` headers; the browser blocked your JS from reading the response). "What does HTTPS protect?" (transport encryption + server identity — **nothing** about server-side bugs). Pattern-match each question to its one-paragraph answer; if you can do that for all six, you're past the security floor.

---

## Concept 1 — SQL injection and parametrized queries

```python
# VULNERABLE — user input concatenated into the SQL string:
name = request.args["name"]
cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")

# If name = "'; DROP TABLE users; --"
# Resulting SQL: SELECT * FROM users WHERE name = ''; DROP TABLE users; --'
# The DB executes BOTH statements. Table is gone.

# SAFE — parametrized query; DB driver handles escaping:
cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
```

The vulnerability is structural: when you interpolate user input into a SQL *string*, the DB driver receives one blob containing both your template and the attacker's payload, and cannot tell them apart. The fix is structural: parametrized queries send the SQL template (`SELECT ... WHERE name = ?`) and the values (`("Robert',); DROP ...",)`) as *separate* arguments. The driver substitutes the value into the prepared statement in a way that *cannot* terminate the string or inject new statements — escaping is the right mental model only at the very lowest level; conceptually, the value never becomes SQL.

**Why string escaping is the wrong fix:** escaping is fragile (every quote character variant, every encoding edge case is a potential bypass) and you have to remember it every time. Parametrized queries make injection impossible by construction.

**Why "we use an ORM" isn't the right answer either:** ORMs (SQLAlchemy, Django ORM) *use* parametrized queries under the hood. They're a *convenience layer*, not the *defense*. The defense is parametrization; the ORM happens to deliver it. The interview probe is whether you can articulate the underlying mechanism, not name the tool.

---

## Concept 2 — Password hashing: `bcrypt`, `argon2` (never plaintext, never MD5)

```python
import bcrypt

# Store:
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))   # cost factor 12
db.users.insert({"email": email, "password_hash": hashed})

# Verify:
ok = bcrypt.checkpw(submitted_password.encode(), stored_hash)
```

Three claims you cannot mess up:

1. **Plaintext storage is catastrophic.** Data breaches happen; storing passwords in plaintext means every user's password leaks immediately. Don't.
2. **General-purpose hashes (MD5, SHA-1, SHA-256) are WRONG for passwords.** They're designed to be *fast*; attackers brute-force them at billions of guesses per second on commodity GPUs. The right algorithms (`bcrypt`, `argon2`, `scrypt`) are designed to be *slow* and memory-hard so the per-guess cost makes brute-force impractical.
3. **Salting prevents rainbow-table attacks.** A salt is a random per-password value mixed in before hashing — two users with the same password produce different hashes. `bcrypt` and `argon2` generate and store salts internally; you don't manage them yourself.

The cost factor (e.g., `bcrypt.gensalt(12)` — the `12` means 2^12 = 4096 iterations) is the work knob you turn up as hardware gets faster. A 2026-modern setting is `cost=12` for `bcrypt` or `argon2id` with default parameters from a maintained library.

**"Never roll your own crypto"** is the canonical guidance — use battle-tested libraries (`bcrypt`, `argon2-cffi`, or your framework's auth helpers). The wrong answer to "how would you hash passwords?" is "I'd implement SHA-256 with a salt myself"; the right answer names `bcrypt` or `argon2` and trusts the library.

---

## Concept 3 — JWT vs sessions vs cookies

```
header.payload.signature

eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0Mn0.aBcDeF...
└─────┬─────┘ └────────┬────────┘ └───┬───┘
  base64({         base64({       HMAC-SHA256
   "alg":           "user_id":     of the first
   "HS256"          42             two parts,
  })               })               keyed with
                                    secret
```

- **Sessions** — the server stores user state (in memory, Redis, or a DB); the client gets an *opaque session ID* in a cookie; the server looks up the session record on every request. State lives server-side; revoking a session is one DB delete.
- **JWT (JSON Web Token)** — a *signed* token containing user info; the server verifies the signature without a lookup. Stateless. The structure is `header.payload.signature`, base64-encoded, dot-separated. **The signature proves the token was issued by you; it does NOT encrypt the payload.** Anyone with the token can `base64-decode` the middle segment and read user info. Use `JWE` (JSON Web Encryption) if you need confidentiality.
- **Cookies** — the HTTP mechanism for storing key-value pairs client-side. Independent of sessions/JWT; either mechanism can use cookies for transport. Cookie flags that matter:
  - **`HttpOnly`** — JS cannot access the cookie. Defends against XSS exfiltrating session/auth tokens.
  - **`Secure`** — cookie only sent over HTTPS. Defends against passive eavesdroppers on the network.
  - **`SameSite=Strict|Lax|None`** — defends against CSRF by restricting cross-site cookie sending.

**The tradeoff** between sessions and JWT is revocation versus statelessness. Sessions are trivial to revoke (delete the record) but require server-side storage. JWTs are stateless (scale horizontally without shared state) but hard to revoke before expiry — common patterns are short access tokens (15 min) + refresh tokens, or a server-side denylist of revoked tokens (which... reintroduces server state).

---

## Concept 4 — OAuth 2.0 authorization code flow

The six steps of "Sign in with Google":

1. User clicks "Sign in with Google" on your app.
2. Your app redirects the browser to Google's authorization URL with `client_id`, `redirect_uri`, `scope` (e.g., `email profile`).
3. User authenticates with Google (Google's login UI, not yours), approves your app's requested scopes.
4. Google redirects the browser back to your `redirect_uri` with a short-lived **authorization code** in the query string.
5. Your *server* exchanges the code (plus `client_secret`) for an **access token** via a server-to-server POST to Google's token endpoint.
6. Your app uses the access token to call Google APIs on the user's behalf.

**Key roles:** Resource Owner (the user), Client (your app), Authorization Server (Google's OAuth endpoint), Resource Server (Google's API).

**OAuth is about delegated authorization, not just login convenience.** Your app never sees the user's Google password; it receives a scoped, time-limited token that can call specific APIs. "Sign in with Google" extends OAuth 2.0 with **OpenID Connect** (OIDC) to add an identity layer (`id_token`) on top, but the underlying flow is the same.

**`client_secret` is server-side only.** Browsers and mobile apps can't be trusted with it (any user can read JS source / decompile the app); they use the *PKCE* extension instead (Proof Key for Code Exchange — a session-local challenge/response that replaces the secret for public clients). Implicit flow (where the access token came back directly in the redirect URL) is deprecated for browsers in favor of authorization code + PKCE.

---

## Concept 5 — CORS (Cross-Origin Resource Sharing)

```
Browser at:  https://app.example.com
Trying to:   fetch("https://api.other.com/data")
             from JavaScript

Same-origin policy says: NO by default.
CORS is how the server opts in.
```

Browsers enforce the **same-origin policy** — JS on `app.example.com` cannot read responses from `api.other.com` by default. "Origin" is *scheme + host + port*; differing in any of those is a different origin. CORS is a server-side mechanism to **opt in** to cross-origin requests by sending specific response headers:

- `Access-Control-Allow-Origin: https://app.example.com` — explicit allowlist (best practice).
- `Access-Control-Allow-Origin: *` — allow any origin; *cannot* combine with credentials.
- `Access-Control-Allow-Credentials: true` — explicitly allow cookies / auth headers cross-origin. Browser-side rule: if this is `true`, the `Allow-Origin` *cannot* be `*` — must be a specific origin.

**Preflight requests** — for "non-simple" requests (custom headers like `Authorization: Bearer`, methods other than `GET`/`POST`/`HEAD`, content types other than `application/x-www-form-urlencoded` / `text/plain` / `multipart/form-data`), the browser sends an `OPTIONS` request first to check the server's CORS policy *before* sending the actual request. The server must respond to the preflight with the appropriate `Allow-*` headers; only then does the browser send the real request.

**Critical mental model: CORS errors are browser-side.** The request usually completes at the server (the server runs the handler, queries the DB, returns a response); the browser then *blocks JavaScript* from reading the response if CORS headers aren't right. So a CORS error doesn't mean "your server is unreachable" — it means "your server returned a response your browser refuses to expose to JS". `curl` and Postman ignore CORS entirely; CORS is exclusively a browser-enforced guardrail to protect users from malicious cross-origin JS.

---

## Concept 6 — HTTPS / TLS basics

```
TLS handshake (simplified):
  Client → Server: "I support these ciphers..."
  Server → Client: "Let's use AES-GCM; here's my certificate."
  Both:           derive shared symmetric key from key exchange.
  Both:           encrypt subsequent traffic with that key.
```

HTTPS is **HTTP over TLS** (formerly SSL). TLS provides three things:

1. **Confidentiality** — the connection between client and server is encrypted; eavesdroppers see ciphertext.
2. **Integrity** — tampering with packets in flight is detected.
3. **Server identity** — the server's certificate is signed by a Certificate Authority (CA) the browser trusts; you're talking to the real `bank.com`, not a man-in-the-middle.

**What HTTPS encrypts:** HTTP headers, body, URL path, query string.
**What HTTPS does NOT hide:** the hostname (visible in TLS Server Name Indication / SNI), the destination IP, packet sizes, request timing.

`Let's Encrypt` provides free CA-signed certificates with 90-day validity and automated renewal — the modern default for any public service. Self-signed certificates work but trigger browser warnings (no trusted CA vouches for them); useful for development, never for production.

**The critical mental model: HTTPS protects the transport, not the server.** A site over HTTPS can still:

- Be vulnerable to SQL injection (server-side bug, unrelated to TLS).
- Leak data via XSS (browser-side bug, after TLS has done its job).
- Have CORS misconfigurations (still need correct headers over HTTPS).
- Get compromised at the application level (TLS doesn't authenticate the server's *code*, only its identity).

The wrong answer to "what does HTTPS protect?" is "everything"; the right answer is "transport-layer confidentiality + integrity + server identity, nothing more". The cross-domain threats covered elsewhere in this sphere (injection, hashing, JWT exposure, CORS, OAuth misuse) still apply at full force; HTTPS is a necessary baseline, not a complete answer.

---

## Quick check before you run cards

1. The classic vulnerable line is `cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")`. Write the safe form and explain why it's safe at the level of "what the DB driver does".
2. You're asked "how would you store user passwords?" Give the answer in three claims (algorithm, what's wrong with MD5, salt).
3. A JWT looks encrypted but isn't. What part is base64-readable? What does the signature actually guarantee?
4. Walk through the six steps of "Sign in with Google".
5. You see "CORS error" in the browser console. What ACTUALLY happened on the server? What did the browser refuse to do?
6. Someone says "we're on HTTPS, so we're safe from SQL injection." Why is this wrong?

If any feels shaky — re-read that section, then start the cards.
