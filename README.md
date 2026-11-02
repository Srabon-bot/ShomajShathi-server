# Shomaj Shathi API

Express and MongoDB API for the Shomaj Shathi community events platform.

Every write endpoint and every member endpoint requires a BetterAuth JWT:

```
Authorization: Bearer <token>
```

The API verifies the token against the client's public JWKS
(`${CLIENT_ORIGIN}/api/auth/jwks`) and reads the identity from the token's
`sub` and `email` claims. Identity is never accepted from the request body or
from a URL parameter.

## Endpoints

Public:

- `GET /api/health`
- `GET /api/events?limit=6&page=1&type=Cleanup&q=Dhaka&sort=date`
- `GET /api/events/:id`

Signed in:

- `GET /api/events/mine`
- `POST /api/events`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`
- `GET /api/joins/mine`
- `GET /api/joins/:eventId`
- `POST /api/joins/:eventId`
- `DELETE /api/joins/:eventId`

## Security and limits

- Every write and member endpoint verifies a BetterAuth JWT against
  `${CLIENT_ORIGIN}/api/auth/jwks`, including the `iss` and `aud` claims.
- Ownership is enforced server-side; non-owners receive `403`, missing events
  receive `404`.
- CORS allows only `CLIENT_ORIGIN`; unknown origins receive no allow header.
- JSON bodies are capped at 100kb and invalid bodies return `400`.
- 300 requests per 15 minutes per IP, plus 10 writes per minute on
  `/api/events` and `/api/joins`. Excess writes return `429` with the standard
  error envelope. Limits use an in-memory store, so each serverless instance
  keeps its own counter.
- Production errors return a generic `500` message and never a stack trace.

## Verification

`scripts/auth-matrix.mjs` runs the auth, ownership, validation, CORS and
rate-limit matrix against a deployed API. It creates two temporary accounts and
an event, then removes all of them again. Cleanup needs `MONGODB_URI` and
`MONGODB_DB` in `.env`.

```powershell
npm run test:matrix
```

Last run against `https://shomajshathi-server.vercel.app` on 2 November 2026:
**23/23 passed**.

```text
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

## Local development

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Seed six upcoming events with:

```powershell
npm run seed
```

## Deployment checklist

For a Vercel deployment matching the mentor project, import this server
repository as a Vercel project. The included `vercel.json` deploys the
TypeScript Express entrypoint as a Node function. Local development still uses
`npm run dev`, and a traditional Node host can use `npm run build` followed by
`npm start`.

Configure `MONGODB_URI`, `MONGODB_DB`, `CLIENT_ORIGIN` (the exact client Vercel
origin without a trailing slash), `PORT`, and `NODE_ENV`. `CLIENT_ORIGIN` must
match the client's `BETTER_AUTH_URL` because that origin is the JWT issuer and
audience and also the JWKS host. Use an Atlas M0 database, create a dedicated
database user, and allow the deployment network access. Never commit `.env` or
database credentials.

For Vercel, configure the same variables in the server project with
`NODE_ENV=production`. `PORT` is only needed for local execution.
