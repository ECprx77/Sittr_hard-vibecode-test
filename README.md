# Sittr — Baby-sitting PWA

Monorepo : `backend/` (API) + `frontend/` (React/Vite) + `shared/` (contrat API).

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed    # crée l’admin local
npm run dev     # http://localhost:3001
npm test
```

- Base URL API : `http://localhost:3001/api`
- Auth : cookie de session (`credentials: 'include'`)
- Health : `GET /api/health`
- Config publique : `GET /api/config` → `{ supportPhone, appName }`

Compte admin par défaut (modifiable via `.env`) :
- email : `admin@sittr.local`
- mot de passe : `AdminChangeMe123!`

## Frontend (intégration)

Variables attendues :

```
VITE_API_URL=http://localhost:3001/api
```

Tous les `fetch` authentifiés doivent utiliser `credentials: 'include'`.  
CORS autorise `FRONTEND_ORIGIN` (défaut `http://localhost:5173`).

Types partagés : `shared/types.ts`  
OpenAPI minimal : `shared/openapi.yaml`

### Endpoints MVP

| Méthode | Chemin | Rôle |
|---------|--------|------|
| POST | `/auth/register` | public (`parent` \| `babysitter`) |
| POST | `/auth/login` | public |
| POST | `/auth/logout` | session |
| GET/DELETE | `/auth/me` | session |
| PATCH | `/profiles/me` | session |
| POST | `/profiles/me/photo` | session (multipart `photo`) |
| POST | `/profiles/me/verification-request` | babysitter |
| GET | `/profiles/:userId` | public (téléphone seulement si `phonePublic`) |
| GET | `/search` | public (`city`, `postalCode`, `maxRate`, `day`, `after`, `before`) |
| CRUD | `/availabilities` | babysitter |
| GET/POST/DELETE | `/favorites` | parent |
| GET/POST/PATCH | `/requests` | parent / babysitter |
| GET/PATCH | `/admin/users…` | admin |
| GET | `/config` | public |

Liens `sms:` / `tel:` : côté front uniquement (numéro support via `/config`, téléphone baby-sitter via profil si public).

## Sécurité / RGPD

- Mots de passe hashés (bcrypt)
- Téléphone privé par défaut
- Badge vérifié seulement si statut `verified` (admin)
- `DELETE /auth/me` anonymise le compte
