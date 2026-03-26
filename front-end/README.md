# Front-End: Media Editor

React + Vite front-end for the Team Stereoscopically media editor. The UI lets users upload, preview, and edit images/GIFs while we prototype integrations with Pixabay and other sources.

## Requirements

- Node.js ≥ 18
- npm ≥ 9
- A Pixabay API key (free tier is fine) for live image/video fetching

## Setup

```bash
cd front-end
npm install
```

## Environment variables

1. Duplicate `.env.example` → `.env`.
2. Add your Pixabay key:

```bash
VITE_PIXABAY_API_KEY=your-real-key
```

Vite exposes the variable at build time (`import.meta.env.VITE_PIXABAY_API_KEY`). Keep the `.env` file local—our `.gitignore` already blocks it.

## Data helpers

- `src/services/pixabayService.js` → lightweight fetch helpers for real Pixabay image/video searches. Components should import `fetchPixabayImages` or `fetchPixabayVideos` instead of calling `fetch` directly.
- `src/services/mockMediaService.js` → deterministic mock payloads we can use in Storybook/demos until the live API is ready.

Example usage:

```js
import { fetchPixabayImages } from '../services/pixabayService';

const items = await fetchPixabayImages('sunsets');
```

Each helper returns normalized objects with `id`, `type`, `title`, `previewUrl`, `fullUrl`, and `author` fields so UI components can stay lean.

## Scripts

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — production build (used by CI)
- `npm run lint` — run ESLint using the repo config

## Troubleshooting

- **Missing API key**: the service logs `[pixabayService] Missing VITE_PIXABAY_API_KEY` if the env var is absent. Create/update your `.env` file and restart Vite.
- **429 responses**: Pixabay free tier has a per-minute limit; the helpers will log the HTTP status for debugging. Consider falling back to the mock service while prototyping UI loops.
