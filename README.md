<div align="center">

<br />

# Shomaj Shathi — API

REST API for the Shomaj Shathi community events platform, built with Express 5 and MongoDB.

<br />

[![Live API](https://img.shields.io/badge/Live%20API-shomajshathi--server.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://shomajshathi-server.vercel.app)
&nbsp;
[![Client](https://img.shields.io/badge/Client%20App-shomajshathi--app.vercel.app-22c55e?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://shomajshathi-app.vercel.app)

<br />

![Express](https://img.shields.io/badge/Express%205-000000?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3068B7?style=flat-square&logo=zod&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js%2020-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

<br />

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
| Runtime | Node.js 20 |
| Framework | Express 5 |
| Language | TypeScript |
| Database | MongoDB Atlas — native Node.js driver |
| Auth verification | jose — JWKS remote key set, JWT verification |
| Validation | Zod v4 |
| Security | Helmet, express-rate-limit, CORS allowlist |
| Hosting | Vercel — serverless Node function via `vercel.json` |

---

## Endpoints

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check — returns `{ status: "ok" }` |
| `GET` | `/api/events` | List events with filtering and pagination |
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

| Measure | Detail |
|---|---|
| JWT verification | All write and member endpoints verify the token against `${CLIENT_ORIGIN}/api/auth/jwks`, including `iss` and `aud` claims |
| Ownership enforcement | Non-owners receive `403 Forbidden`; missing resources receive `404 Not Found` |
| CORS | Requests are allowed only from `CLIENT_ORIGIN`; unrecognised origins receive no allow header |
| Body size | JSON bodies are capped at 100 KB; oversized or malformed bodies return `400` |
| Rate limiting — global | 300 requests per 15 minutes per IP |
| Rate limiting — writes | 10 write requests per minute on `/api/events` and `/api/joins`; excess returns `429` |
| Error messages | Production errors return a generic `500` message — stack traces are never exposed |

---

## Response Envelope

All endpoints respond with a consistent JSON structure.

```jsonc
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Human-readable error." }

// Validation error
{ "success": false, "message": "Invalid request data.", "issues": [ ... ] }
```

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── env.ts                # Environment config parsed and validated with Zod
│   ├── db/
│   │   └── connect.ts            # MongoDB connection singleton
│   ├── lib/
│   │   └── to-event-dto.ts       # Maps a MongoDB document to the API response shape
│   ├── middleware/
│   │   └── auth.ts               # JWKS remote key fetch and JWT verification
│   ├── models/
│   │   ├── event.model.ts        # Events collection — schema and query helpers
│   │   └── join.model.ts         # Joins collection — schema and query helpers
│   ├── routes/
│   │   ├── event.routes.ts       # /api/events handlers
│   │   └── join.routes.ts        # /api/joins handlers
│   ├── scripts/
│   │   └── seed.ts               # Seeds the database with sample upcoming events
│   ├── types/
│   │   └── express.d.ts          # Augments Express Request with verified user identity
│   ├── app.ts                    # App factory — middleware stack, rate limiters, routes
│   └── index.ts                  # Entry point — binds HTTP server
├── scripts/
│   └── auth-matrix.mjs           # End-to-end auth and security test suite
├── dist/                         # Compiled JavaScript output
├── .env.example
├── vercel.json
└── package.json
```

---

## Local Development

**Prerequisites:** Node.js 20+ and a MongoDB Atlas cluster.

```powershell
# Install dependencies
npm ci

# Copy the environment template
Copy-Item .env.example .env

# Start the development server with hot reload
npm run dev
```

Seed the database with six sample upcoming events:

```powershell
npm run seed
```

**Scripts**

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot reload via tsx |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production server |
| `npm run seed` | Populate the database with sample events |
| `npm run test:matrix` | Run the full auth and security test suite |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```env
PORT=5000
NODE_ENV=development

# Exact client origin — no trailing slash
# Must match the client's BETTER_AUTH_URL: it is the JWT issuer, JWT audience, and JWKS host
CLIENT_ORIGIN=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net
MONGODB_DB=shomaj_shathi
```

---

## Test Matrix

`scripts/auth-matrix.mjs` exercises the full auth, ownership, validation, CORS, and rate-limit surface area against a deployed API. It creates two temporary accounts and one event, then removes all test data at the end. Cleanup requires `MONGODB_URI` and `MONGODB_DB` in `.env`.

```powershell
npm run test:matrix
```

Last run against `https://shomajshathi-server.vercel.app` on 2 November 2026: **23 / 23 passed**.

```
PASS  public events list                         200
PASS  write without token                        401
PASS  write with tampered token                  401
PASS  past date rejected                         400
PASS  invalid body rejected                      400
PASS  create own event                           201
PASS  non-owner patch forbidden                  403
PASS  non-owner delete forbidden                 403
PASS  owner patch succeeds                       200
PASS  non-JSON write rejected                    400
PASS  owner joins event                          201
PASS  duplicate join rejected                    409
PASS  join full event rejected                   409
PASS  joined list is auth-only                   200
PASS  joined list contains event
PASS  own events list is auth-only               200
PASS  unknown origin gets no allow header
PASS  app origin gets allow header
PASS  delete own event                           204
PASS  missing event returns 404
PASS  rapid writes reach 429                     429s=23
PASS  rate-limit envelope                        Too many requests. Please try again shortly.
PASS  temporary data cleaned up
```

---

## Deployment Checklist

- [ ] Import the server repository as a separate Vercel project
- [ ] The included `vercel.json` handles serverless configuration — no extra settings required
- [ ] Set `MONGODB_URI`, `MONGODB_DB`, `CLIENT_ORIGIN`, and `NODE_ENV=production` in Vercel
- [ ] Omit `PORT` on Vercel — it is only needed for local execution
- [ ] `CLIENT_ORIGIN` must match the client's `BETTER_AUTH_URL` exactly
- [ ] MongoDB Atlas: create a dedicated database user and allow the Vercel deployment network
- [ ] After deploying, run `npm run test:matrix` to confirm all 23 checks pass
- [ ] Never commit `.env` or database credentials

---

<div align="center">

[shomajshathi-server.vercel.app](https://shomajshathi-server.vercel.app)

</div>
