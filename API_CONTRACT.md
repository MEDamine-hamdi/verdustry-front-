# ESG Platform — API Contract (Frontend ↔ FastAPI)

**Backend:** `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)  
**Auth header:** `Authorization: Bearer <access_token>`  
**Content-Type:** `application/json`



## Roles (exact strings)

`EXECUTIVE` | `ESG_MANAGER` | `ADMIN` | `AUDITOR`

---

## Auth

### `POST /auth/login`
Public. Authenticate user.

**Body**
```json
{ "email": "admin@company.com", "password": "secret" }
```

**200**
```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "uuid-or-string",
    "email": "admin@company.com",
    "name": "Admin User",
    "role": "ADMIN",
    "companyId": "company-uuid"
  }
}
```

**401** invalid credentials  
**CORS** required for browser/NextAuth server calls

---

### `POST /auth/signup`
Public. Create company + first user as `ADMIN`.

**Body**
```json
{
  "companyName": "GreenTech Tunisia",
  "sector": "Manufacturing",
  "country": "Tunisia",
  "adminName": "Sara Ben Ali",
  "email": "sara@greentech.tn",
  "password": "secret123"
}
```

**201**
```json
{
  "company": {
    "id": "company-uuid",
    "name": "GreenTech Tunisia",
    "sector": "Manufacturing",
    "country": "Tunisia",
    "createdAt": "2026-07-23T10:00:00Z"
  },
  "user": {
    "id": "user-uuid",
    "email": "sara@greentech.tn",
    "name": "Sara Ben Ali",
    "role": "ADMIN",
    "isActive": true,
    "companyId": "company-uuid"
  }
}
```

**400** validation error  
**409** email already exists  

---

### `GET /auth/me` (recommended)
Authenticated. Current user from JWT.

**200** — same shape as `user` in login response (+ `isActive`, `companyId`)

---

## Users (ADMIN only)

All require `Authorization: Bearer <token>`.

### `GET /users`
List users for the admin’s company (no passwords).

**200**
```json
[
  {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "ESG_MANAGER",
    "isActive": true,
    "companyId": "..."
  }
]
```

### `POST /users`
Create user in the same company.

**Body**
```json
{
  "email": "new@company.com",
  "name": "New User",
  "role": "ESG_MANAGER",
  "password": "password123",
  "isActive": true
}
```

**201** created user (no password)

### `PUT /users/{id}`
Update user. All fields optional.

**Body**
```json
{
  "email": "...",
  "name": "...",
  "role": "AUDITOR",
  "password": "optional-new-password",
  "isActive": false
}
```

**200** updated user

### `DELETE /users/{id}`
**200** `{ "ok": true }`

---

## Errors

Prefer:
```json
{ "error": "Human readable message" }
```

FastAPI `detail` (string or validation array) is also accepted by the frontend.

---

## Backend checklist

- [ ] PostgreSQL tables: `companies`, `users` (with `company_id`, hashed password, role)
- [ ] `POST /auth/login` (JWT)
- [ ] `POST /auth/signup`
- [ ] `GET/POST/PUT/DELETE /users` (ADMIN)
- [ ] CORS: `http://localhost:3000`
- [ ] Roles match exact strings above
- [ ] Never return password hashes in JSON

---

## Frontend env

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=...
AUTH_URL=http://localhost:3000
```

Client code lives in `src/lib/api.ts`.
