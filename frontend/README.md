# Frontend Sittr

À développer avec React + Vite.

## Connexion API

```env
VITE_API_URL=http://localhost:3001/api
```

```ts
await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password }),
});
```

Voir `../shared/types.ts` et `../shared/openapi.yaml`.
Voir `../README.md` pour la liste des endpoints.
