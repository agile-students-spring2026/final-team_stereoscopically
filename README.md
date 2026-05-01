# StickerCreate Web App

## Description

This project came from a desire to make online chats more engaging and entertaining with properly formatted custom stickers. Often times the gifs, emojis, and stickers that internet chat users want to send are sized incorrectly and difficult to edit. Our integrated app will allow users to create and resize their personal stickers, edit and apply filters, and create gifs from videos all in one place.

## Product Vision Statement

Our vision is to build a lightweight application that allows users to quickly resize images and convert videos into GIFs. 

The Minimum Viable Product will allow users to: 
- Upload image and video files
- Resize images to standard preset sizes or custom dimensions
- Convert videos into GIF format
- Preview a creation
- Download finished stickers or GIFs directly to device


## Team Members 

- Bella D'Aquino - [GitHub Account Link](https://github.com/belladaq)
- Faith Winford - [GitHub Account Link](https://github.com/fwinford)
- Lily Luo - [GitHub Account Link](https://github.com/lilyluo7412)
- Lia Yoonseo Jang - [GitHub Account Link](https://github.com/LiaYoonseoJang)


## Contributions
Find the guidelines for contributing to this project at [this link](https://github.com/agile-students-spring2026/final-team_stereoscopically/blob/master/CONTRIBUTING.md). 


## UX Design

Find the wireframes, app map, and clickable prototype for this project at [this link](https://github.com/agile-students-spring2026/final-team_stereoscopically/blob/master/UX-DESIGN.md).

## Deployed application

**Production front-end (Sprint 4):** *[replace with your DigitalOcean live URL and keep it HTTPS when possible](#)*

Instructions: [`instructions-4-deployment.md`](./instructions-4-deployment.md).

## Running the App Locally

Follow these steps to get the front-end running locally in a development environment.

### Prerequesites 
Ensure you have Node.js and npm installed

### Step by Step Instructions

- Clone the repository to your local machine
- Navigate to the front-end directory
- Install dependencies: `npm install`
 
- Start the development server: `npm run dev`
- Also start the back-end server in `back-end` (`npm install` then `npm run dev`) so API requests work at `http://localhost:4000`.

- Open the app in your browser by navigating to: `http://localhost:5173/`

**Docker Compose (below):** use **`http://localhost:8080/`** instead—you do **not** need local `npm run dev` for the bundled front-end or API while those containers run.

### Run unit tests

- **Back-end** (Mocha + Chai): from the `back-end` directory, run `npm test`.
- **Front-end** (Vitest): run `npm test` in `front-end` (script uses `vitest run`).

### Check Back-End Coverage (c8)

- Run: `npm run coverage` in `back-end`
- This generates a terminal coverage summary and an HTML report.

## Docker (optional / extra credit)

Prerequisites: Docker with Compose (`docker compose`), and a JWT secret (`JWT_SECRET`).

1. Copy [`.env.deploy.example`](./.env.deploy.example) to **`.env`** in the repo root and set **`JWT_SECRET`**. Omit **`MONGODB_URI`** if you want the bundled MongoDB service from Compose; otherwise set it to Atlas (matching your usual database policy).

2. From the repo root:

```bash
docker compose up --build
```

3. Open **`http://localhost:8080/`** (API is under `/api/...` via Nginx; see [`front-end/nginx.default.conf`](./front-end/nginx.default.conf)). Direct API on the host defaults to port **4000**; if that port is busy, set **`HOST_API_PORT`** in `.env`.

## Continuous Integration / Continuous Deployment

### CI (automated builds and tests — extra credit)

Workflow: **[`.github/workflows/ci.yml`](./.github/workflows/ci.yml)**

On every **push** and **pull_request**, GitHub Actions:

- Runs **front-end**: `eslint`, production `vite build`, and **Vitest**
- Spins up **MongoDB 7**, exports `JWT_SECRET`, runs **back-end** `npm test` (covers integration routes that rely on Mongoose / GridFS)
- Runs **`docker compose build`** so container images stay buildable without credentials

Failed jobs show under the Actions tab.

### CD (optional / extra credit)

Workflow: **[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)**

Triggered on **`push`** to **`main`** or **`master`** and via **workflow_dispatch**. The deploy job runs **only when** repository secret **`DROPLET_DEPLOY_ENABLED`** is literally **`true`** (anything else skips the job cleanly).

Suggested secrets:

| Secret | Purpose |
|--------|---------|
| `DROPLET_DEPLOY_ENABLED` | Set string `true` to turn on deployments |
| `DROPLET_HOST` | Droplet public IP or DNS name |
| `DROPLET_USER` | SSH username (often `root` or a deploy account) |
| `DROPLET_SSH_KEY` | Private key that can run `docker compose up` remotely |
| `DROPLET_APP_PATH` | Absolute path on the droplet containing this repo |

On the droplet, install Docker Compose, clone the repo once under `DROPLET_APP_PATH`, add a production **`.env`**, then the workflow runs `git pull` and **`docker compose up -d --build`**.

Customize the SSH script inside the workflow if your server layout differs.

## Extra credit

Sprint 4 extra credit (per course instructions): **up to three options at 5% each** toward the Sprint 4 Quality Score. Our team is claiming the following.

| # | Option | Status | Where / how |
|---|--------|--------|--------------|
| 1 | **Deployment with Docker containers** | **Completed (in-repo)** | Root [`docker-compose.yml`](./docker-compose.yml) orchestrates **`mongo`**, **`api`** ([`back-end/Dockerfile`](./back-end/Dockerfile)), and **`web`** ([`front-end/Dockerfile`](./front-end/Dockerfile)); Nginx config [`front-end/nginx.default.conf`](./front-end/nginx.default.conf) serves the SPA and proxies **`/api/`** to the API container. Quick start steps are under **Docker** above. |
| 2 | **Continuous Integration (GitHub Actions)** | **Completed (in-repo)** | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on **every push and pull_request**: front-end lint, build, and tests; back-end tests with a **MongoDB 7** service container; **`docker compose build`** to verify images build. |
| 3 | **Continuous Deployment** | **Completed (workflow in-repo; enable on Droplet)** | [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) SSHes to DigitalOcean **when** secret **`DROPLET_DEPLOY_ENABLED`** is set to the string **`true`**, runs `git pull` and **`docker compose up -d --build`**. Droplet secrets and path are documented in **CD** above. |

We will send the **same summary** (this table and links) to course admins via the **team Discord channel**, as required.
