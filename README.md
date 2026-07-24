# ESG Platform — Frontend (FastAPI ready)

Next.js UI connected to a **FastAPI + PostgreSQL** backend.  
No mock users / in-memory store.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind
- NextAuth (Credentials → FastAPI JWT)
- All business data from FastAPI

## Setup

```powershell
cd frontend
npm install
copy .env.example .env.local
```

Edit `.env.local`:

```env
AUTH_SECRET=<random-32+-chars>
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_URL=http://localhost:3000
```

Start backend first, then:

```powershell
npm run dev
```

Open http://localhost:3000

## Required backend (must be running)

| Method | Endpoint |
|---|---|
| POST | `/auth/login` |
| POST | `/auth/signup` |
| GET | `/users` |
| POST | `/users` |
| PUT | `/users/{id}` |
| DELETE | `/users/{id}` |

Full contract: see [`API_CONTRACT.md`](./API_CONTRACT.md)

CORS must allow `http://localhost:3000`.

## Pages

| Route | Who |
|---|---|
| `/login` | Public |
| `/signup` | Public — company + admin registration |
| `/dashboard` | Authenticated |
| `/admin/users` | ADMIN only |

## Project structure (integration-focused)

```
src/
  lib/api.ts          ← ALL FastAPI calls (single client)
  auth.ts             ← NextAuth → POST /auth/login
  app/login/          ← Sign in UI
  app/signup/         ← Company signup UI
  app/dashboard/      ← Authenticated home
  app/admin/users/    ← User CRUD via /users
  app/api/auth/       ← NextAuth handlers only
```

## How auth works

1. Login/signup call FastAPI
2. Backend returns `access_token` + user
3. NextAuth stores token in the session JWT
4. Admin pages call FastAPI with `Authorization: Bearer <token>`
