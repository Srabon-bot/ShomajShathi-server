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
