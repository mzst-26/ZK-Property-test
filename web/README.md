# Next.js frontend

This application implements the admin and member consoles for the anonymous workspace product. It uses the Next.js App Router,
Tailwind CSS, and integrates Noir/Barretenberg in a WebWorker (stubs provided).

## Available scripts

- `npm run dev` – start the development server.
- `npm run build` – create a production build.
- `npm run start` – run the production build.
- `npm run lint` – lint using Next.js defaults.

## Structure

- `app/` – routes for landing, admin, and member experiences.
- `components/` – UI building blocks such as section cards, feature lists, and proof flows.
- `lib/` – API clients and (stubbed) Noir proving helpers.
- `public/` – static assets and compiled Noir artifacts.

## Proving workflow

`lib/proof-worker.ts` contains the placeholder entry point for invoking Noir WASM. Compile the circuits in `../noir` and expose
the generated WASM bundle from a worker to keep proof generation off the main thread.
