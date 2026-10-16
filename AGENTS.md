<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Development

Install dependencies with `npm ci`, then start the app with `npm run dev` (port 3000). No secrets are required for local development.

Shared shift data is stored in `data/shared-state.json` unless both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set. Login uses `ACCESS_PASSWORD` when it is set; otherwise the issued password in `src/lib/auth/session.ts` is accepted. The Supabase variables in `.env.example` are unused by the current login.

`next-env.d.ts` is gitignored and written by `next dev` or `next build`. Run one of those before `npx tsc --noEmit`. `npm run build` is the TypeScript check this project runs.
