# StickerCreate — Front-end

React **18** + **Vite** SPA for the StickerCreate app: image editor, video → GIF flow, auth, **Home** (search, follow, feed, private **Save sticker** bookmarks), and **My Creations** (drafts, exports, profile).

## Requirements

- Node.js **18+** and npm

## Setup & dev

```bash
npm install
npm run dev
```

Default: **`http://localhost:5173`**. Point the UI at your API (see `src/services/backendMediaClient.js` / env). For full-stack local dev, run the **back-end** on **`http://localhost:4000`** (see `../back-end/readme.md`).

## Build

```bash
npm run build
```

Preview production build: `npm run preview`.

## Tests

```bash
npm test -- --run
```

Watch mode: `npm run test:watch`. Tests live under **`test/`**.

## Docker

With root **`docker compose up`**, use the port documented in the **root** [`README.md`](../README.md) (typically **`http://localhost:8080`**).

## UX notes

- **From People You Follow:** **Save sticker** keeps a post on your list for you only (poster isn’t notified); **Saved** rows sort to the top; a short line shows how many you’ve saved here.
