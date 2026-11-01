# Shomaj Shathi API

Express and MongoDB API for the Shomaj Shathi community events platform.

## Endpoints

- `GET /api/health`
- `GET /api/events?limit=6&page=1&type=Cleanup&q=Dhaka&sort=date`
- `GET /api/events/:id`
- `GET /api/events/mine`
- `POST /api/events`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`

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

Configure `MONGODB_URI`, `MONGODB_DB`, `CLIENT_ORIGIN` (the exact client
Vercel origin without a trailing slash), `PORT`, `NODE_ENV`, and
`ALLOW_ANON_WRITES` locally. Set `ALLOW_ANON_WRITES=true` only for local
temporary CRUD verification; each write must include an `x-dev-email` header.
Keep it `false` in Vercel until BetterAuth/JWT is implemented. Use an Atlas M0
database, create a dedicated database user, and allow the deployment network
access. Never commit `.env` or database credentials.

For Vercel, configure the same `MONGODB_URI`, `MONGODB_DB`, `CLIENT_ORIGIN`,
`NODE_ENV=production`, and `ALLOW_ANON_WRITES=false` variables in the server
project. `PORT` is only needed for local execution.
