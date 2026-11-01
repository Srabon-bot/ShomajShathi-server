# Shomaj Shathi API

Express and MongoDB API for the Shomaj Shathi community events platform.

## Endpoints

- `GET /api/health`
- `GET /api/events?limit=6&page=1&type=Cleanup&q=Dhaka&sort=date`
- `GET /api/events/:id`

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

Render build command: `npm ci && npm run build`  
Render start command: `npm start`  
Health check path: `/api/health`

Configure `MONGODB_URI`, `MONGODB_DB`, `CLIENT_ORIGIN` (the exact Vercel origin without a
trailing slash), `PORT`, and `NODE_ENV` in Render. Use an Atlas M0 database,
create a dedicated database user, and allow the deployment network access.
Never commit `.env` or database credentials.
