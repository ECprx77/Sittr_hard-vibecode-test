# Sittr — Baby-sitting PWA

Monorepo : `backend/` (API Express + SQLite) + `frontend/` (React + Vite PWA) + `shared/` (types + OpenAPI).

## Démarrage local

Deux terminaux :

```bash
# API
cd backend
cp .env.example .env
npm install
npm run seed          # admin local
npm run seed:demo     # profils de démo (optionnel)
npm run dev           # http://localhost:3001

# Front
cd frontend
cp .env.example .env  # laisser VITE_API_URL vide en local
npm install
npm run dev           # http://localhost:5173
```

En local, Vite proxy `/api` et `/uploads` vers `http://localhost:3001`.  
Les appels front utilisent `credentials: 'include'` (cookie de session).

### Comptes

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@sittr.local` | `AdminChangeMe123!` (via `.env`) |
| Démo baby-sitters | `camille@sittr.local`, etc. | `DemoSittr123!` |

## Configuration

**Backend** (`backend/.env`) :

- `PORT`, `DATABASE_PATH`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, `SUPPORT_PHONE`

**Frontend** (`frontend/.env`) :

- Local : `VITE_API_URL=` (vide → proxy Vite)
- Production : origine API **sans** suffixe dupliqué, ex. `https://api.exemple.fr`  
  (les chemins client sont déjà `/api/...`)

## Contrat API

- Types : `shared/types.ts`
- OpenAPI : `shared/openapi.yaml`
- Health : `GET /api/health`
- Config : `GET /api/config` → `{ supportPhone, appName }`

## Tests

```bash
cd backend && npm test
cd frontend && npm test && npm run build
```

## Sécurité / RGPD

- Mots de passe hashés (bcrypt), sessions cookie `httpOnly`
- Téléphone privé sauf `phonePublic`
- Badge « vérifié » uniquement si statut admin `verified`
- `DELETE /api/auth/me` anonymise le compte
- Ne jamais committer `backend/.env` ni `*.sqlite`

## Déploiement (notes)

- Front : build statique (`frontend/dist`) — `vercel.json` inclut le rewrite SPA
- Back : Node 20+, SQLite fichier, définir `SESSION_SECRET`, `FRONTEND_ORIGIN`, cookies `secure` en prod
