# Baby-sitting Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une API REST Express + SQLite sécurisée pour la PWA Baby-sitting, avec contrat `shared/` exploitable par le frontend parallèle.

**Architecture:** Monorepo `backend/` (Express, sessions cookie, better-sqlite3) + `shared/` (types + OpenAPI). Routes par domaine ; validation zod ; rôles parent/babysitter/admin.

**Tech Stack:** Node 20, Express, TypeScript, better-sqlite3, express-session, connect-sqlite3, bcrypt, zod, multer, cors, helmet, express-rate-limit, vitest + supertest.

## Global Constraints

- Limiter les dépendances externes ; éviter bibliothèques lourdes.
- Mots de passe jamais en clair (bcrypt).
- Téléphone privé sauf `phone_public=1`.
- Badge vérifié uniquement si `verification_status === verified`.
- Pas d’IA, géoloc permanente, SMS payant, push, carte lourde.
- Admin non créable via register.
- `credentials: include` + CORS `FRONTEND_ORIGIN`.

---

### Task 1: Scaffold backend + shared contract

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/src/config.ts`, `backend/src/index.ts`, `backend/.env.example`
- Create: `shared/types.ts`, `shared/openapi.yaml`
- Create: `README.md`, root `.gitignore` (déjà partiel)

**Interfaces:**
- Produces: `AppConfig` from env ; types `Role`, `VerificationStatus`, `PublicProfile`, API error shape

- [ ] **Step 1: Init backend package with scripts and deps**

```json
{
  "name": "sittr-backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "seed": "tsx src/db/seed.ts"
  }
}
```

Deps: express, better-sqlite3, express-session, connect-sqlite3, bcrypt, zod, cors, helmet, express-rate-limit, multer, dotenv.  
Dev: typescript, tsx, vitest, @types/*, supertest, @types/supertest.

- [ ] **Step 2: Write `shared/types.ts` and minimal `shared/openapi.yaml` covering auth, profiles, search, availabilities, favorites, requests, admin, config**

- [ ] **Step 3: `config.ts` loads PORT, DATABASE_PATH, SESSION_SECRET, FRONTEND_ORIGIN, SUPPORT_PHONE, NODE_ENV**

- [ ] **Step 4: Health-only `index.ts` listening ; commit `chore: scaffold backend and shared API contract`**

---

### Task 2: Database schema + helpers

**Files:**
- Create: `backend/src/db/schema.sql`, `backend/src/db/index.ts`, `backend/src/db/seed.ts`
- Test: `backend/src/db/db.test.ts`

**Interfaces:**
- Produces: `getDb()`, `migrate()`, tables users/profiles/availabilities/favorites/requests

- [ ] **Step 1: Write failing test that migrate creates `users` table**

- [ ] **Step 2: Implement schema.sql + migrate(); test passes**

- [ ] **Step 3: Seed script creates one admin (env ADMIN_EMAIL/ADMIN_PASSWORD defaults for local)**

- [ ] **Step 4: Commit `feat: add SQLite schema and seed admin`**

---

### Task 3: Auth (register/login/logout/me/delete)

**Files:**
- Create: `backend/src/middleware/auth.ts`, `backend/src/routes/auth.ts`, `backend/src/app.ts`
- Test: `backend/src/routes/auth.test.ts`

**Interfaces:**
- Produces: session `userId`/`role`; `requireAuth`, `requireRole(...roles)`
- Routes as in design spec

- [ ] **Step 1: Failing tests — register parent, login sets cookie, me returns user, logout clears, cannot register admin**

- [ ] **Step 2: Implement auth routes + bcrypt + session store SQLite**

- [ ] **Step 3: DELETE /api/auth/me soft-deletes and clears PII fields**

- [ ] **Step 4: Commit `feat: add session auth with roles`**

---

### Task 4: Profiles + photo upload

**Files:**
- Create: `backend/src/routes/profiles.ts`, `backend/src/utils/profile.ts`
- Test: `backend/src/routes/profiles.test.ts`

**Interfaces:**
- Produces: `toPublicProfile(row, viewer)` hiding phone unless phone_public or owner/admin

- [ ] **Step 1: Tests PATCH me, GET public hides phone, verification-request → pending**

- [ ] **Step 2: Implement routes + multer uploads (1MB, image/*)**

- [ ] **Step 3: Commit `feat: add profiles and private phone rules`**

---

### Task 5: Availabilities + search

**Files:**
- Create: `backend/src/routes/availabilities.ts`, `backend/src/routes/search.ts`
- Test: `backend/src/routes/search.test.ts`

**Interfaces:**
- Search query: city, postalCode, maxRate, day, after, before

- [ ] **Step 1: Tests CRUD availabilities + search filters**

- [ ] **Step 2: Implement routes**

- [ ] **Step 3: Commit `feat: add availabilities and search`**

---

### Task 6: Favorites, requests, admin, config

**Files:**
- Create: `backend/src/routes/favorites.ts`, `backend/src/routes/requests.ts`, `backend/src/routes/admin.ts`, `backend/src/routes/config.ts`
- Test: `backend/src/routes/requests.test.ts`

**Interfaces:**
- Status transitions: parent cancelled; babysitter seen|accepted|declined
- Admin PATCH verification status

- [ ] **Step 1: Tests favorites, request flow, admin verification, GET config**

- [ ] **Step 2: Implement routes + wire into app.ts**

- [ ] **Step 3: Commit `feat: add favorites requests admin config`**

---

### Task 7: README + smoke integration + front handshake

**Files:**
- Create/Modify: `README.md`, `backend/.env.example`
- Optionally leave `frontend/README.md` stub with expected `VITE_API_URL` and credentials include

- [ ] **Step 1: Document start commands, env, API base, cookie auth for front agent**

- [ ] **Step 2: Manual smoke via curl: register → login → profile → availability → search → config**

- [ ] **Step 3: Commit `docs: backend README and frontend integration notes`**

- [ ] **Step 4: When frontend exists, run joint validation of MVP flows**

---

## Spec coverage checklist

- Auth + roles + bcrypt + sessions ✓
- Profiles fields + private phone ✓
- Search city/CP/rate/availability ✓
- Availabilities CRUD ✓
- Favorites + requests ✓
- Admin verification ✓
- Support phone config ✓
- Account deletion RGPD ✓
- Shared contract for parallel front ✓
- SMS/tel links = front responsibility (backend exposes phone only if public) ✓
