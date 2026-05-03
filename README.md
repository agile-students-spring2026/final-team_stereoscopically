# StickerCreate

Web app to **crop / resize / filter** images and **trim → resize → filter → export** videos to **GIF**, with **accounts**, **drafts**, **publish + follow feed**, and **private bookmarks** on feed items (no notification to creators).

**Stack:** React (Vite) front-end · Express + MongoDB/GridFS back-end · Docker Compose for local full stack.

## Database

Per [`instructions-3-database.md`](./instructions-3-database.md), dynamic data is stored in **MongoDB** (**MongoDB Atlas** in production). Set **`MONGODB_URI`** and **`JWT_SECRET`** only in **`.env`** files (`back-end/.env` from [`.env.example`](./back-end/.env.example) for the API; repo-root **`.env`** from [`.env.deploy.example`](./.env.deploy.example) for Docker). Those files are **gitignored**—never commit URIs, passwords, or other secrets. For grading, we submit any required `.env` contents to course staff via the **course Discord** in **our team's channel**.

## Team

- Bella D'Aquino — [GitHub](https://github.com/belladaq)
- Faith Winford — [GitHub](https://github.com/fwinford)
- Lily Luo — [GitHub](https://github.com/lilyluo7412)
- Lia Yoonseo Jang — [GitHub](https://github.com/LiaYoonseoJang)

## Contributing & UX

- [CONTRIBUTING.md](https://github.com/agile-students-spring2026/final-team_stereoscopically/blob/master/CONTRIBUTING.md)
- [UX-DESIGN.md](https://github.com/agile-students-spring2026/final-team_stereoscopically/blob/master/UX-DESIGN.md)

## Deployed app

Production URL: *(replace when live — prefer HTTPS).*  
Deployment notes: [`instructions-4-deployment.md`](./instructions-4-deployment.md).

## Run locally

**Prerequisites:** Node.js, npm; for API tests/coverage, MongoDB + `JWT_SECRET`.

1. **API:** `cd back-end && npm install && cp .env.example .env` → set `MONGODB_URI`, `JWT_SECRET` → `npm run dev` (default port **4000**).
2. **UI:** `cd front-end && npm install && npm run dev` → open **http://localhost:5173**.

**Docker (all-in-one):** from repo root, copy `.env.deploy.example` to `.env`, set at least `JWT_SECRET`, then `docker compose up --build`. Open **http://localhost:8080** (see [`front-end/nginx.default.conf`](./front-end/nginx.default.conf)); API is proxied under **`/api/`**.

## Tests & coverage

| Area | Command |
|------|---------|
| Back-end tests | `cd back-end && npm test` |
| Back-end coverage report | `cd back-end && npm run coverage` |
| Back-end coverage gate | `cd back-end && npm run coverage:check` |
| Front-end tests | `cd front-end && npm test -- --run` |

Course back-end bar is documented in [`instructions-2-back-end.md`](./instructions-2-back-end.md).

## CI / CD (optional)

- **CI:** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — lint, build, Vitest, back-end tests (Mongo service), `docker compose build`.
- **CD:** [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) — runs when secret `DROPLET_DEPLOY_ENABLED` is the string `true`; see workflow file for SSH / path secrets.

## Extra credit (Sprint 4)

| Item | Where |
|------|--------|
| Docker Compose | [`docker-compose.yml`](./docker-compose.yml), `back-end/Dockerfile`, `front-end/Dockerfile` |
| CI | `.github/workflows/ci.yml` |
| CD | `.github/workflows/deploy.yml` |

## Package readmes

- [`front-end/README.md`](./front-end/README.md) — Vite app, scripts, tests  
- [`back-end/readme.md`](./back-end/readme.md) — API, scripts, endpoint reference  
