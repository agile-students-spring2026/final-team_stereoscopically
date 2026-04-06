# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## GIF conversion flow (manual test)

These steps verify the backend-connected GIF conversion flow in the UI.

1. Start the backend server that implements `POST /api/convert/gif`.
2. Start the Vite dev server for the front-end.
3. Open the app and navigate to the GIF editor flow.
4. Upload a valid video file.
5. Click **Create GIF** and confirm:
	- The status shows “Converting clip to GIF…”.
	- On success, the “Your GIF is ready” card appears with an ID and URL.
6. Upload a non-video file and confirm you see “Please select a video file.”
7. Upload a file larger than 50 MB and confirm you see “File is too large (max 50 MB).”

Expected behavior:

- Invalid files do **not** call the backend.
- Backend errors surface as conversion errors without clearing the selected video.
