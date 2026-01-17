<!-- language: markdown -->

# Home Budget App

Short guide and documentation for the "Home Budget App" — a household budget management application.

## Purpose

Home Budget App is a simple application to manage household finances: records incomes, expenses, categories, meter readings and provides reports and charts.

Repository structure (short)
- `budget-app/` \- frontend (Vue 3 + Vite + Vuetify)
- `budget-app-backend/` \- backend (NestJS + Prisma + PostgreSQL)
- `docker-compose.yml` \- compose file for services (Postgres + apps), uses `REGISTRY_HOST` env var for images
- `compose-registry.yml` \- example local registry compose
- `env.example` \- example environment variables
- `build-and-push.sh` (in subfolders) \- helper scripts to build and push images
- `budget-app-backend/prisma/schema.prisma` \- Prisma schema

### Requirements
- Docker & Docker Compose (compatible with the compose syntax used)
- Node.js (recommended 18+ for local dev)
- npm or pnpm/yarn

### Quick start (simplest, using docker-compose)
1. Copy example env:

```bash
cp env.example .env
# edit .env if you need to change REGISTRY_HOST or VITE_API_URL
```

2. Optional: start a local registry (example provided)

```bash
docker compose -f compose-registry.yml up -d
```

3. Start all services:

```bash
docker compose up -d
```

If you use images from a registry, set `REGISTRY_HOST` in `.env` (e.g. `localhost:5000` or `registry.company.com:5000`). The `.env` next to `docker-compose.yml` is automatically used by Docker Compose.

## Local development

###  Frontend (dev server)
1. Go to the frontend folder:

```bash
cd budget-app
npm install
```

2. Set the API address used by the dev-server in `env.example` (default `VITE_API_URL=http://localhost:3000`).

3. Run:

```bash
npm run dev
```

Frontend dev server is configured in `vite.config.mts`. Requests to `/api/v1` are proxied to `VITE_API_URL`.

### Backend (NestJS)
1. Go to the backend folder:

```bash
cd budget-app-backend
npm install
```

2. Start in development (watch):

```bash
npm run start:dev
```

Backend listens on port 3000 by default. Ensure `DATABASE_URL` and other env vars are set if running without the Postgres container.

Image registry and configuration variables

- `docker-compose.yml` and the build scripts use the `REGISTRY_HOST` environment variable.
- `env.example` defaults to `REGISTRY_HOST=localhost:5000` so anyone can run a simple local registry without code changes.
- To push images to a registry, set `REGISTRY_HOST` accordingly and run:

```bash
# in backend folder
./budget-app-backend/build-and-push.sh

# in frontend folder
./budget-app/build-and-push.sh
```

Build-and-push scripts read `REGISTRY_HOST` (with a fallback to `localhost:5000`). You can also use manual `docker build`, `docker tag`, `docker push`.

Database migrations (Prisma)

- Prisma schema: `budget-app-backend/prisma/schema.prisma`.

Run migrations locally:

```bash
cd budget-app-backend
npm install
npx prisma migrate deploy
# or during development:
npx prisma migrate dev --name your_migration_name
```

### Configuration files and settings
- `budget-app/vite.config.mts` \- dev-server proxy uses `VITE_API_URL`.
- `docker-compose.yml` \- uses `${REGISTRY_HOST}` for images; place `.env` next to it to override.

Troubleshooting — common cases
- Problem: docker-compose cannot pull image using host name `registry`.
  - Cause: Docker daemon resolves registry names; the host name must be reachable from the host (e.g. `localhost:5000` or fully qualified domain). Set `REGISTRY_HOST` to an address resolvable by Docker.

- Problem: frontend dev-server requests to backend fail (403/404/CORS)
  - Check `VITE_API_URL` and proxy in `vite.config.mts`.

- Problem: missing dependencies
  - Run `npm install` in `budget-app` and `budget-app-backend`.

Keywords (technologies)
- TypeScript
- JavaScript
- Vue 3
- Vite
- Vuetify
- NestJS
- Prisma
- PostgreSQL
- Docker
- Docker Compose
- Node.js
- npm / pnpm / yarn
- SQL
