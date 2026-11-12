# Design backend — Baby-sitting PWA

Date : 2026-11-12  
Périmètre : backend + contrat API partagé (le frontend React/Vite est développé en parallèle).

## Objectif

API REST légère pour une plateforme de mise en relation parents / baby-sitters : auth, profils, recherche, disponibilités, contact (SMS/tel côté front), favoris et demandes (schéma MVP), vérification admin.

## Décisions

| Sujet | Choix |
|-------|--------|
| Organisation | Monorepo `frontend/` + `backend/` + `shared/` |
| Runtime | Node.js 20 + Express |
| Base | SQLite (`better-sqlite3`), fichier local |
| Auth | Sessions cookie `httpOnly` + `express-session` + store SQLite |
| Mots de passe | `bcrypt` (coût 10) |
| Validation | `zod` côté serveur |
| Contrat front | Types TS + OpenAPI minimal dans `shared/` |
| Photos | Upload local optionnel (`uploads/`), formats image légers |
| Support tel | `SUPPORT_PHONE` (env), exposé via `GET /api/config` |

Hors MVP backend (prévus mais non bloquants) : avis, push, géoloc, SMS payant, IA.

## Architecture

```
sittr/
├── backend/
│   ├── src/
│   │   ├── index.ts          # bootstrap Express
│   │   ├── config.ts         # env
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── index.ts      # init + migrations simples
│   │   ├── middleware/
│   │   │   ├── auth.ts       # requireAuth, requireRole
│   │   │   └── validate.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── profiles.ts
│   │   │   ├── search.ts
│   │   │   ├── availabilities.ts
│   │   │   ├── favorites.ts
│   │   │   ├── requests.ts
│   │   │   ├── admin.ts
│   │   │   └── config.ts
│   │   └── utils/
│   ├── data/                 # sittr.sqlite (gitignore)
│   ├── uploads/              # photos (gitignore)
│   ├── .env.example
│   └── package.json
├── frontend/                 # React + Vite (autre agent)
├── shared/
│   ├── openapi.yaml          # contrat API
│   └── types.ts              # types partagés
└── README.md
```

Principes : peu de dépendances, endpoints ciblés, pas de cache des données personnelles, validation client + serveur.

## Modèle de données (SQLite)

### `users`
- `id` INTEGER PK
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `role` TEXT NOT NULL — `parent` | `babysitter` | `admin`
- `created_at` TEXT NOT NULL
- `deleted_at` TEXT NULL — soft delete / RGPD

### `profiles`
- `user_id` INTEGER PK FK → users
- `first_name` TEXT NOT NULL
- `age` INTEGER NULL
- `city` TEXT NULL
- `postal_code` TEXT NULL
- `bio` TEXT NULL
- `experience` TEXT NULL
- `hourly_rate` REAL NULL — pertinent pour babysitter
- `phone` TEXT NULL — **privé** : jamais exposé en public sans consentement
- `phone_public` INTEGER NOT NULL DEFAULT 0 — consentement explicite
- `photo_path` TEXT NULL
- `verification_status` TEXT NOT NULL DEFAULT `unverified`
  — `unverified` | `pending` | `verified`
- `updated_at` TEXT NOT NULL

### `availabilities`
- `id` INTEGER PK
- `user_id` INTEGER FK → users (babysitter)
- `day_of_week` INTEGER NOT NULL — 0=dim … 6=sam
- `start_time` TEXT NOT NULL — `HH:MM`
- `end_time` TEXT NOT NULL — `HH:MM`
- UNIQUE(`user_id`, `day_of_week`, `start_time`, `end_time`)

### `favorites`
- `parent_id` INTEGER FK
- `babysitter_id` INTEGER FK
- `created_at` TEXT
- PRIMARY KEY (`parent_id`, `babysitter_id`)

### `requests`
- `id` INTEGER PK
- `parent_id` INTEGER FK
- `babysitter_id` INTEGER FK
- `message` TEXT NULL
- `status` TEXT NOT NULL DEFAULT `sent`
  — `sent` | `seen` | `accepted` | `declined` | `cancelled`
- `created_at` TEXT NOT NULL

### Sessions
Table gérée par le store de session SQLite (ou table `sessions` dédiée).

## Visibilité des données

**Profil public (recherche / consultation)** : prénom, âge, ville, code postal, bio, expérience, tarif, disponibilités, photo, badge vérifié (`verification_status === verified` uniquement).  
**Jamais public sans `phone_public=1`** : téléphone, email.  
**Propriétaire / admin** : accès aux champs privés selon rôle.

## API REST (`/api`)

### Config
- `GET /api/config` → `{ supportPhone, appName }` (public)

### Auth
- `POST /api/auth/register` — `{ email, password, role: parent|babysitter, firstName }`  
  (`admin` non créable via register ; seed manuel / script)
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me` — user + profil (auth)
- `DELETE /api/auth/me` — suppression compte (RGPD, soft puis purge champs)

### Profils
- `GET /api/profiles/:userId` — vue publique ou complète selon droits
- `PATCH /api/profiles/me` — modifier son profil
- `POST /api/profiles/me/photo` — upload photo (multipart, optionnel)
- `POST /api/profiles/me/verification-request` — passe en `pending` (babysitter)

### Recherche
- `GET /api/search?city=&postalCode=&maxRate=&day=&after=&before=`
  — baby-sitters non supprimés ; filtres optionnels sur tarif et dispo jour/horaire

### Disponibilités (babysitter)
- `GET /api/availabilities/me`
- `GET /api/availabilities/:userId` — public
- `POST /api/availabilities` — `{ dayOfWeek, startTime, endTime }`
- `PATCH /api/availabilities/:id`
- `DELETE /api/availabilities/:id`

### Favoris (parent)
- `GET /api/favorites`
- `POST /api/favorites/:babysitterId`
- `DELETE /api/favorites/:babysitterId`

### Demandes
- `GET /api/requests/sent` — parent
- `GET /api/requests/received` — babysitter
- `POST /api/requests` — `{ babysitterId, message? }`
- `PATCH /api/requests/:id` — `{ status }`  
  Transitions MVP : parent `cancelled` ; babysitter `seen` | `accepted` | `declined`

### Admin
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/verification` — `{ status: unverified|pending|verified }`

Réponses d’erreur JSON : `{ error: string, details?: unknown }` avec codes HTTP cohérents (400/401/403/404/409/500).

## Sécurité

- Hash bcrypt, jamais de mot de passe en clair
- Cookie de session : `httpOnly`, `secure` en prod, `sameSite=lax`
- Contrôle de rôle sur chaque route sensible
- Validation zod de tous les body/query
- Rate limiting basique sur login/register
- CORS : origine front configurée (`FRONTEND_ORIGIN`)
- Uploads : types MIME image, taille max (~1 Mo), pas d’exécution
- Soft delete + droit à l’effacement
- Pas de cache HTTP agressif sur réponses authentifiées

## Contact SMS / téléphone (front)

Le backend expose `phone` **uniquement** si `phone_public=1` (MVP strict).  
Le front construit `sms:` et `tel:` ; pas d’envoi SMS serveur.

## Intégration front parallèle

1. Publier `shared/openapi.yaml` + `shared/types.ts` dès le début.
2. Base URL : `VITE_API_URL` (ex. `http://localhost:3001/api`).
3. Credentials : `fetch(..., { credentials: 'include' })`.
4. Validation finale : parcours inscription → profil → dispo → recherche → SMS/tel → PWA (côté front).

## Variables d’environnement

```
PORT=3001
DATABASE_PATH=./data/sittr.sqlite
SESSION_SECRET=change-me
FRONTEND_ORIGIN=http://localhost:5173
SUPPORT_PHONE=+33123456789
NODE_ENV=development
```

## Critères de succès backend

- Inscription / connexion / déconnexion réelles
- Profils créés et modifiés
- Recherche ville/CP/tarif/dispo
- Disponibilités CRUD persistées
- Téléphone support configurable
- Rôles respectés ; téléphone privé protégé
- Suppression de compte
- API documentée pour le front
- Stack légère (Express + SQLite + deps minimales)

## Hors scope explicite

IA, reconnaissance faciale, appels vidéo, carte interactive, push notifications MVP, géoloc permanente, service SMS payant.
