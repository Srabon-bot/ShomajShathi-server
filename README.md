<div align="center">

# Shomaj Shathi — API

REST API for the Shomaj Shathi community events platform, built with Express 5 and MongoDB.

[![Live API](https://img.shields.io/badge/Live%20API-shomajshathi--server.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://shomajshathi-server.vercel.app)
&nbsp;
[![Live Site](https://img.shields.io/badge/Live%20Site-shomajshathi--app.vercel.app-22c55e?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://shomajshathi-app.vercel.app)
&nbsp;
[![Client Repo](https://img.shields.io/badge/Client%20Repo-ShomajShathi--app-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Srabon-bot/ShomajShathi-app)

</div>

---

## Overview

Every write endpoint and every member endpoint requires a BetterAuth JWT:

```
Authorization: Bearer <token>
```

The API verifies the token against the client's public JWKS endpoint at `${CLIENT_ORIGIN}/api/auth/jwks` and reads the user identity from the token's `sub` and `email` claims. Identity is never accepted from the request body or from a URL parameter.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | ![Node.js](https://img.shields.io/badge/Node.js%2020-339933?style=flat-square&logo=nodedotjs&logoColor=white) |
| Framework | ![Express](https://img.shields.io/badge/Express%205-000000?style=flat-square&logo=express&logoColor=white) |
| Language | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| Database | ![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white) |
| Auth verification | ![JWT](https://img.shields.io/badge/JWT-D63AFF?style=flat-square&logo=jsonwebtokens&logoColor=white) `jose` with a remote JWKS key set |
| Validation | ![Zod](https://img.shields.io/badge/Zod%20v4-3068B7?style=flat-square&logo=zod&logoColor=white) |
| Security | Helmet, express-rate-limit, CORS allowlist |
| Hosting | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) |

---

## Endpoints

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/events` | List upcoming events with filtering and pagination |
| `GET` | `/api/events/:id` | Single event by ID |

**Query parameters for `GET /api/events`**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `6` | Results per page |
| `type` | string | — | Filter by event type (e.g. `Cleanup`) |
| `q` | string | — | Keyword search across title and description |
| `sort` | string | — | `date` to sort by event date ascending |

### Signed-in (JWT required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events/mine` | Events created by the authenticated user |
| `POST` | `/api/events` | Create a new event |
| `PATCH` | `/api/events/:id` | Update an event — owner only |
| `DELETE` | `/api/events/:id` | Delete an event — owner only |
| `GET` | `/api/joins/mine` | Events joined by the authenticated user |
| `GET` | `/api/joins/:eventId` | Join count and the caller's join status |
| `POST` | `/api/joins/:eventId` | Join an event |
| `DELETE` | `/api/joins/:eventId` | Leave an event |

---

## Security

- **JWT verification** on every write and member endpoint, including `iss` and `aud` claims
- **Ownership enforcement** — non-owners get `403`, missing resources get `404`
- **CORS allowlist** — only `CLIENT_ORIGIN` is accepted
- **Validation** — Zod schemas on every request body; past event dates are rejected
- **Rate limiting** — 300 requests per 15 minutes globally, 10 writes per minute
- **Safe errors** — production errors never expose stack traces

A script (`npm run test:matrix`) checks all of this against the deployed API. Last run: **23 / 23 passed**.

---

## Local Development

**Prerequisites:** Node.js 20+ and a MongoDB Atlas cluster.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Optionally seed six sample upcoming events:

```powershell
npm run seed
```

Fill in `.env`:

```env
PORT=5000
NODE_ENV=development

# Exact client origin, no trailing slash. Must match the client's BETTER_AUTH_URL
CLIENT_ORIGIN=http://localhost:3000

MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net
MONGODB_DB=shomaj_shathi
```
