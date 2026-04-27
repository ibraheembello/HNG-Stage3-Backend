# Insighta Labs+ — Backend API

> Secure, multi-interface profile intelligence platform. CLI, web, and API — same data, same permissions, same security model. **HNG Backend Internship · Stage 3.**

[![CI](https://github.com/ibraheembello/HNG-Stage3-Backend/actions/workflows/ci.yml/badge.svg)](https://github.com/ibraheembello/HNG-Stage3-Backend/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-20+-brightgreen)
![Stack](https://img.shields.io/badge/stack-typescript%20%C2%B7%20express%20%C2%B7%20prisma%20%C2%B7%20postgres-blueviolet)
![Deploy](https://img.shields.io/badge/deploy-aws%20app%20runner-orange)

---

## 🌐 Live URLs

| Component | URL |
|---|---|
| **Backend API** | https://pep3ec3gaj.us-east-1.awsapprunner.com/api/v1 |
| **Web Portal** | https://insighta-web-eta.vercel.app |
| **Health** | https://pep3ec3gaj.us-east-1.awsapprunner.com/api/v1/health |

## 📦 Sibling repositories

| Repo | Purpose |
|---|---|
| 🔵 **HNG-Stage3-Backend** (this) | Express + Prisma + Postgres API, OAuth + RBAC + CSV |
| 💻 [HNG-Stage3-CLI](https://github.com/ibraheembello/HNG-Stage3-CLI) | Globally-installable Node CLI — `insighta login/logout/whoami/profiles …` |
| 🌐 [HNG-Stage3-Web](https://github.com/ibraheembello/HNG-Stage3-Web) | Next.js + Tailwind web portal — http-only cookies + CSRF |

---

## 🖼 Screenshots

### Web portal — landing → dashboard

| Landing hero | Feature highlights |
|---|---|
| ![landing](docs/screenshots/01-landing.png) | ![features](docs/screenshots/02-landing-features.png) |

| Dashboard (admin) | Profiles list + filters |
|---|---|
| ![dashboard](docs/screenshots/03-dashboard.png) | ![profiles](docs/screenshots/04-profiles-list.png) |

| Natural-language search | Account |
|---|---|
| ![search](docs/screenshots/05-search.png) | ![account](docs/screenshots/06-account.png) |

### CLI — production end-to-end

| OAuth + PKCE login against AWS | Full command run-through |
|---|---|
| ![cli-login](docs/screenshots/07-cli-login.png) | ![cli-commands](docs/screenshots/08-cli-commands.png) |

---

## 🏛 System architecture

```mermaid
flowchart LR
    subgraph Clients
      direction TB
      CLI["💻 insighta CLI<br/>(global npm)<br/>~/.insighta/credentials.json"]
      WEB["🌐 Web Portal<br/>(Next.js · Vercel)<br/>HTTP-only cookies + CSRF"]
    end

    subgraph Backend["🔵 Backend API · AWS App Runner"]
      direction TB
      MID["Middleware<br/>helmet · pino-http · cors<br/>rate-limit · csrf · X-API-Version<br/>requireAuth · requireRole"]
      AUTH["/api/v1/auth/*<br/>github OAuth+PKCE<br/>refresh · logout · me · csrf"]
      PROF["/api/v1/profiles/*<br/>list · get · search · export · create"]
      USERS["/api/v1/users/*<br/>(admin only)"]
      MID --> AUTH
      MID --> PROF
      MID --> USERS
    end

    DB[("🗄 PostgreSQL · Neon<br/>users · refresh_tokens<br/>oauth_states · profiles")]
    GH[["🐙 GitHub OAuth<br/>(PKCE / authorization_code)"]]

    CLI -- "Bearer access token<br/>refresh in body" --> Backend
    WEB -- "session cookie<br/>+ X-CSRF-Token" --> Backend
    Backend --> DB
    Backend <--> GH
    CLI <-. "browser opens<br/>PKCE redirect" .-> GH
    WEB <-. "redirect login" .-> GH
```

### Repository layout

```
src/
├── app.ts                       # Express app composition
├── server.ts                    # listen() + graceful shutdown
├── config/
│   ├── env.ts                   # validates env vars at boot
│   └── prisma.ts                # singleton PrismaClient
├── middleware/
│   ├── auth.ts                  # requireAuth (JWT bearer/cookie)
│   ├── rbac.ts                  # requireRole('admin' | 'analyst')
│   ├── csrf.ts                  # signed double-submit cookie (browser-only)
│   ├── apiVersion.ts            # X-API-Version: 1 enforcement
│   ├── rateLimit.ts             # per-user 60/min, auth 10/min
│   ├── logger.ts                # pino-http with request id
│   └── error.ts                 # standard {error: {code,message,details}}
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts      # PKCE state, GitHub exchange
│   │   └── tokens.service.ts    # JWT + refresh rotation
│   ├── profiles/
│   │   ├── profiles.routes.ts
│   │   ├── profiles.controller.ts
│   │   ├── profiles.service.ts
│   │   ├── profiles.export.ts   # CSV streaming
│   │   └── nl.parser.ts         # ported from Stage 2
│   └── users/
│       ├── users.routes.ts      # admin only
│       └── users.controller.ts
└── utils/
    ├── pkce.ts                  # verifier + S256 challenge + state
    ├── pagination.ts            # TRD envelope + HATEOAS links
    ├── csv.ts                   # RFC4180 escaping
    └── errors.ts                # AppError + factories
prisma/
├── schema.prisma                # User · RefreshToken · OAuthState · Profile
├── seed.ts                      # 15 fallback profiles if profiles.json absent
└── migrations/
```

---

## 🔐 Authentication flow — GitHub OAuth + PKCE

The same backend serves two clients with one OAuth app. The `state` row in Postgres remembers which client started the flow, so the callback handler routes the response to the right place.

```mermaid
sequenceDiagram
    autonumber
    participant C as 💻 / 🌐 Client
    participant B as 🔵 Backend
    participant G as 🐙 GitHub

    C->>C: generate code_verifier (CLI)<br/>or backend generates it (web)
    C->>B: POST /auth/github { client_type, code_challenge, redirect_uri }
    B->>B: persist OAuthState{ state, challenge, verifier?, client_type, redirect_uri }
    B-->>C: { authorize_url, state }

    C->>G: open authorize_url
    G->>C: user clicks "Authorize"
    G->>B: GET /auth/github/callback?code=&state=

    alt client_type = web
        B->>G: POST /access_token { code, code_verifier (stored), redirect_uri }
        G-->>B: github access_token
        B->>G: GET /user
        B->>B: upsert User · sign access JWT (3m) · issue refresh (5m)
        B-->>C: 302 → web redirect_uri<br/>Set-Cookie: access · refresh · csrf (HttpOnly Secure SameSite=Lax)
    else client_type = cli
        B-->>C: 302 → CLI loopback ?code=&state=
        C->>B: POST /auth/github/cli/exchange { code, state, code_verifier }
        B->>B: verify deriveChallenge(verifier) === stored challenge
        B->>G: POST /access_token { code, code_verifier (from CLI), redirect_uri }
        G-->>B: github access_token
        B->>G: GET /user
        B->>B: upsert User · sign access JWT (3m) · issue refresh (5m)
        B-->>C: { access_token, refresh_token, refresh_expires_at, user }
    end
```

### Token handling approach

| Token | Lifetime | Storage | Where it lives |
|---|---|---|---|
| **Access (JWT, HS256)** | **3 minutes** | Stateless | `Authorization: Bearer …` (CLI) **or** `access_token` HTTP-only cookie (web) |
| **Refresh (opaque random hex)** | **5 minutes** | DB row, **SHA-256 hash** only | Returned as JSON to CLI; HTTP-only cookie for web |
| **CSRF** | 1 hour | Signed double-submit cookie | `csrf_token` non-HttpOnly cookie + `X-CSRF-Token` header on mutating browser requests |

Refresh tokens are **rotated on every use**: old one is marked `revoked_at = now()` atomically as the new one is created (`prisma.$transaction`). Replays of a revoked token return `401 UNAUTHORIZED`. The Stage 3 TRD specifies these aggressive 3 m / 5 m TTLs — the CLI and the web frontend both auto-refresh on `401` to keep the session alive seamlessly.

### Role enforcement logic

Every protected route runs through `requireAuth → requireRole(...allowed)`. The role is read from the verified JWT (no DB hit for permission checks).

| Endpoint | Method | `admin` | `analyst` |
|---|---|---|---|
| `/profiles` | GET | ✅ | ✅ |
| `/profiles/:id` | GET | ✅ | ✅ |
| `/profiles/search` | GET | ✅ | ✅ |
| `/profiles/export` | GET | ✅ | ✅ |
| `/profiles` | **POST** | ✅ | ❌ 403 |
| `/users` | GET | ✅ | ❌ 403 |
| `/users/:id/role` | PATCH | ✅ | ❌ 403 |

The first GitHub login from a username matching `ADMIN_GITHUB_USERNAME` is auto-promoted to `admin`. All other users default to `analyst` and can only be promoted by an admin via `PATCH /users/:id/role`.

### Natural-language parsing approach

A **deterministic regex parser** (no LLM, no external API) ported verbatim from Stage 2. Example: `young males from Nigeria` →

```ts
{
  gender: 'male',           // matches /\bmales?\b/
  age_group: undefined,     // (no age-group keyword present)
  min_age: 16, max_age: 24, // matches /\byoung\b/
  country_id: 'NG',         // looks up "nigeria" in the country map
}
```

The parser is intentionally conservative and **AND-only** (no OR/NOT semantics) — same behaviour as Stage 2 so existing graders pass. Returns `null` when no token in the query is recognised; the controller then responds with an empty paginated envelope.

Source: [`src/modules/profiles/nl.parser.ts`](src/modules/profiles/nl.parser.ts).

---

## 🚀 API reference

All `/profiles/*` and `/users/*` requests require the **`X-API-Version: 1`** header. Missing or unsupported version returns `400 BAD_REQUEST`.

### Standard envelope shapes

**Single resource:**
```json
{ "status": "success", "data": { ... } }
```

**Paginated list (TRD-mandated keys):**
```json
{
  "status": "success",
  "data": [ ... ],
  "page": 1,
  "limit": 20,
  "total": 137,
  "total_pages": 7,
  "links": {
    "self": "/api/v1/profiles?page=1&limit=20",
    "first": "/api/v1/profiles?page=1&limit=20",
    "last":  "/api/v1/profiles?page=7&limit=20",
    "next":  "/api/v1/profiles?page=2&limit=20",
    "prev":  null
  }
}
```

**Error:**
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Missing access token", "details": null } }
```

### Quick cURL recipes

> Set these once for clarity:
> ```bash
> BASE="https://pep3ec3gaj.us-east-1.awsapprunner.com/api/v1"
> TOKEN="<paste your access token from `insighta login` / web cookies>"
> ```

#### 1. Health (unauthenticated)
```bash
curl -s "$BASE/health"
# → {"status":"success","data":{"status":"ok","env":"production","time":"..."}}
```

#### 2. Start GitHub OAuth (browser flow)
```bash
curl -s -X POST "$BASE/auth/github" \
  -H 'Content-Type: application/json' \
  -d '{"client_type":"web","redirect_uri":"https://insighta-web-eta.vercel.app/dashboard"}'
# → {"data":{"authorize_url":"https://github.com/login/oauth/authorize?...","state":"..."}}
```

#### 3. Refresh tokens
```bash
curl -s -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"<your refresh hex>"}'
```

#### 4. List profiles (filter + sort + paginate)
```bash
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer $TOKEN" \
  "$BASE/profiles?gender=female&age_group=adult&country_id=NG&sort_by=age&order=asc&page=1&limit=20"
```

#### 5. Natural-language search
```bash
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer $TOKEN" \
  "$BASE/profiles/search?q=young+males+from+nigeria"
```

#### 6. CSV export (filters apply)
```bash
curl -sL -H "X-API-Version: 1" -H "Authorization: Bearer $TOKEN" \
  "$BASE/profiles/export?gender=male" -o profiles.csv
```

#### 7. Create a profile (admin only)
```bash
curl -s -X POST "$BASE/profiles" \
  -H "X-API-Version: 1" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Adaeze",
    "gender": "female",
    "gender_probability": 0.94,
    "age": 27,
    "age_group": "adult",
    "country_id": "NG",
    "country_name": "Nigeria",
    "country_probability": 0.91
  }'
```

Analyst hitting this endpoint receives:
```json
{ "error": { "code": "FORBIDDEN", "message": "Requires one of roles: admin", "details": null } }
```

#### 8. Whoami (current user from token)
```bash
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer $TOKEN" "$BASE/auth/me"
```

### Endpoint matrix

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/health` | — | — | Liveness check |
| POST | `/auth/github` | — | — | Start OAuth+PKCE flow |
| GET | `/auth/github/callback` | — | — | GitHub redirect lands here |
| POST | `/auth/github/cli/exchange` | — | — | CLI completes the flow |
| POST | `/auth/refresh` | — | — | Rotate access + refresh |
| POST | `/auth/logout` | — | — | Revoke refresh, clear cookies |
| GET | `/auth/me` | bearer/cookie | any | Current user |
| GET | `/auth/csrf` | — | — | Issue CSRF cookie + token |
| GET | `/profiles` | required | any | List with filter/sort/paginate |
| GET | `/profiles/:id` | required | any | Single profile |
| GET | `/profiles/search?q=` | required | any | NL search |
| GET | `/profiles/export` | required | any | CSV stream of filtered set |
| POST | `/profiles` | required | **admin** | Create profile |
| GET | `/users` | required | **admin** | List users |
| PATCH | `/users/:id/role` | required | **admin** | Set role |

---

## ⚡ Rate limiting

| Scope | Limit | Key |
|---|---|---|
| `/auth/*` | 10 req / min | client IP |
| All other `/api/v1/*` | 60 req / min | authenticated user id (falls back to IP if anonymous) |

Exceeded limits return `429 TOO_MANY_REQUESTS` with the standard error envelope. Implementation: [`src/middleware/rateLimit.ts`](src/middleware/rateLimit.ts).

## 🪵 Request logging

Every request gets an `X-Request-Id` (echoed in the response header). Pino logs JSON-line records: `{ level, time, reqId, req: {method,url,remoteAddress}, res: {statusCode}, responseTime }`. Implementation: [`src/middleware/logger.ts`](src/middleware/logger.ts).

---

## 📦 Setup & run

### Prerequisites
- **Node.js ≥ 20** (App Runner uses Node 22 in production)
- **PostgreSQL** — [Neon](https://neon.tech) free tier works perfectly
- **GitHub OAuth App** — create at https://github.com/settings/developers

### 1. Clone & install
```bash
git clone https://github.com/ibraheembello/HNG-Stage3-Backend.git
cd HNG-Stage3-Backend
npm install
```

### 2. Configure `.env`
Copy `.env.example` → `.env` and fill in:

| Var | Example / source |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` (Neon) |
| `GITHUB_CLIENT_ID` | from your GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | from your GitHub OAuth App |
| `GITHUB_OAUTH_CALLBACK_URL` | `http://localhost:8787/api/v1/auth/github/callback` (dev) |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |
| `CSRF_SECRET` | `openssl rand -hex 32` |
| `ACCESS_TOKEN_TTL` | `3m` |
| `REFRESH_TOKEN_TTL` | `5m` |
| `WEB_ORIGIN` | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `60` |
| `AUTH_RATE_LIMIT_MAX` | `10` |
| `ADMIN_GITHUB_USERNAME` | your GitHub login (auto-admins on first sign-in) |

### 3. Database
```bash
npm run prisma:migrate    # creates the four tables
npm run seed              # adds 15 sample profiles if profiles.json missing
```

### 4. Run
```bash
npm run dev               # ts-node-dev with reload
# or
npm run build && npm start
```

Server listens on `http://localhost:8787`. Hit `/api/v1/health` to confirm.

---

## 🚢 Deployment — AWS App Runner

The repo deploys to App Runner via **"Source code repository"** connection — no Docker push needed.

### Setup once
1. AWS Console → **App Runner** → Create service.
2. **Source**: Source code repository → connect this GitHub repo, branch `main`, automatic deploys.
3. **Build**: choose **"Configure all settings here"**:
   - Runtime: **Node.js 22** (or 20)
   - Build command: `npm ci && npx prisma generate && npm run build`
   - Start command: `npm start` *(npm prestart runs `prisma migrate deploy` automatically)*
   - Port: `8787`
4. **Service**: name `insighta-labs-backend`, 1 vCPU / 2 GB.
5. **Environment variables**: set everything from `.env.example` (use plain text). Set `NODE_ENV=production` and `COOKIE_SECURE=true`.
6. **Health check**: HTTP, path `/api/v1/health`.
7. Click **Create & deploy**.

Subsequent pushes to `main` trigger automatic redeploys via the GitHub connection.

### After first deploy
- Copy the App Runner default domain (e.g. `https://abc.us-east-1.awsapprunner.com`).
- Update `GITHUB_OAUTH_CALLBACK_URL` to `https://<that-domain>/api/v1/auth/github/callback` (or to your web portal's URL — see web repo).
- Update the GitHub OAuth App's Authorization callback URL to match.
- Redeploy (auto).

---

## 🧪 CI

GitHub Actions runs on every push to `main` and every PR:
1. `npm ci`
2. `npx prisma generate`
3. `npx tsc --noEmit`
4. `npm run build`
5. Verify `dist/server.js` exists

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## 🌳 Engineering standards

- **Conventional Commits** — every commit follows `<type>(<scope>): <subject>` (see [Fynix guide](https://fynix.dev/blog/git-commit-message-guide)).
- **Branch naming** — `<type>/<short-kebab-description>` (e.g. `feat/oauth-pkce`, `fix/cookie-domain-default`).
- **PR-first workflow** for non-trivial changes (see merged PR #1 — `feat: align backend with TRD spec`).
- **No backwards-compat shims**, **no AI co-author trailers**, **no generated comments**.

---

## 📝 License

MIT
