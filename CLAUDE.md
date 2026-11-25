# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A **to-do list web app** and a **learning project**. It is a React + Vite front end plus a small **Node.js + Express back end** for accounts: sign up, log in and log out. Accounts live in a remote **Azure SQL Database**. Tasks are still saved in the browser's `localStorage`, not per account.

- [docs/PRD.md](docs/PRD.md) is the source of truth for scope and acceptance criteria (US-1 to US-12).
- [GLOSSARY.md](GLOSSARY.md) lists the domain words. Use them in code, UI text and docs.
- [docs/adr/](docs/adr/) records architecture decisions (0001: Express + Azure SQL + JWT cookie).

## Current status

- v1 (tasks, US-1 to US-9) and v1.1 (accounts, US-10 to US-12) are built.
- Tests:
  - Vitest unit tests: `src/domain`, `src/storage`, `server/*.test.js`. Server tests use supertest, an in-memory user store and `// @vitest-environment node`.
  - React Testing Library: `src/App.test.jsx` (tasks) and `src/Root.test.jsx` (accounts, with `fetch` stubbed).
  - Playwright: `e2e/tasks.spec.js` and `e2e/auth.spec.js`. Both stub the API with `page.route`.
  - **No test touches the real database.**
- Shared UI error messages live in `src/components/titleErrors.js` and `src/components/authErrors.js`. They are kept out of component files so React Fast Refresh works.
- First-time setup for end-to-end tests: `npx playwright install chromium`.

## Commands

- `npm run dev`: start the React dev server (port 5173; proxies `/register`, `/login`, `/logout`, `/me` to port 3001)
- `npm run server`: start the API for development (`server/dev.js`, reads `.env`, watch mode)
- `npm start`: start the API in production mode (`server/index.js`, serves `dist/`; used by Azure)
- `npm run build` / `npm run preview`: build and preview the production bundle
- `npm test`: run all Vitest tests once
- `npm run test:watch`: Vitest in watch mode
- `npm run test:e2e`: run Playwright tests
- `npm run lint`: ESLint
- `npm run format`: Prettier

Run one test file or one test:

```
npx vitest run src/domain/tasks.test.js
npx vitest run server/app.test.js
npx vitest run -t "part of the test name"
npx playwright test e2e/tasks.spec.js
```

## Tech stack

- JavaScript (ES modules, no TypeScript). Node.js 22.9+.
- Front end: React 19 + Vite, Tailwind CSS (all styling; no CSS files except the Tailwind import), `localStorage`.
- Back end: Express 5, `mssql` (Azure SQL), `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `helmet`, `express-rate-limit`.
- Tests and tooling: Vitest + React Testing Library (jsdom) + supertest, Playwright, ESLint + Prettier.

## Architecture (the big picture)

**Tasks:** data flows one way: **`App.jsx` → domain functions → state → storage**.

- `src/domain/tasks.js`: **pure functions only** (no React, no storage). Holds validation, create / rename / toggle / delete / toggleAll / clearCompleted, sorting and filtering.
- `src/storage/taskStorage.js`: the **only** file that touches `localStorage`. `loadTasks()` and `saveTasks()` never throw. They return an error code: `'corrupted'` or `'unavailable'`.
- `src/components/`: presentational only. They get data and callbacks as props (`AuthScreen` too).
- `App.jsx`: owns the task state, calls the domain functions, saves after each change, and shows the storage warning. Optional `user` / `onLogout` props show the "Logged in as" bar.
- Storage key: `todo-app.tasks.v1`. The value is a JSON array of Tasks.
- Task shape: `id` (`crypto.randomUUID()`), `title`, `completed`, `createdAt` (ISO string), `completedAt` (ISO string or `null`), `timeSpentSeconds`, `timerStartedAt`.
- **Ordering is worked out when needed, never stored:** active tasks by `createdAt` newest first, then completed tasks by `completedAt` newest first.

**Accounts:** **`Root.jsx` → `src/api/authApi.js` → Express (`server/`) → Azure SQL**.

- `src/main.jsx` renders `Root.jsx`. It calls `GET /me` on start and shows either `AuthScreen` or `App`.
- `src/api/authApi.js`: the **only** browser code that calls the API. It never throws and returns `{ ok, user }` or `{ ok: false, error, fields }`. It uses `credentials: 'include'`.
- `src/domain/accounts.js`: pure validation, **shared by browser and server**. Change the rules here only.
- `server/app.js`: `createApp({ userStore, jwtSecret, ... })`. Routes are `POST /register`, `POST /login`, `POST /logout` and `GET /me`. Dependencies are injected so tests use an in-memory store.
- `server/db.js`: the **only** file that uses `mssql`. Queries are **parameterised only**. Table `dbo.demo_todolist_manvitha` (columns `id, username, password_hash, name, email`) is created by hand, not by code.
- `server/auth.js`: bcrypt (cost 12) and the JWT session (HS256, 8h). `publicUser()` strips the hash.
- `server/config.js`: reads `DB_CONNECTION_STRING`, `JWT_SECRET` (32+ chars) and `PORT` from the **environment only**.
- `server/index.js` (production: Secure cookie, trust proxy, serves `dist/`) and `server/dev.js` (local). Production mode is chosen by the entry point, **not** by `NODE_ENV`.

## Rules to follow

**Naming**

- The word is **Task** (`task`, `tasks`, `addTask`, `TaskItem`). Never use "todo" or "item" in code or UI text. The one exception is the database table name `demo_todolist_manvitha`, which is fixed by the database.
- Account words follow the glossary: **User, Account, Sign up, Log in, Log out, Session**. In UI text, say "Sign up" and "Log in", not "Register" or "Sign in". (The API path `/register` was set by the requirements.)

**Secrets and security**

- The connection string comes **only** from `DB_CONNECTION_STRING`. Never hard-code it or any password, key or secret. Never commit `.env`. `.env.example` holds placeholders only.
- On Azure, `DB_CONNECTION_STRING` and `JWT_SECRET` are Key Vault references (`Kv-customappsdemo`) in the Web App's app settings. The DB server is `devportalsqlserver.database.windows.net`.
- Never return or log `password_hash` or request bodies. Log in failures give one generic message (`invalid-credentials`) for unknown users and wrong passwords.
- Use SQL parameters only. Never build SQL from user input.

**Behaviour**

- Titles are trimmed, 1–200 characters. Duplicates are allowed.
- Editing to an empty title is rejected and the old title stays. The task is not deleted. Escape cancels an edit.
- Delete and Clear completed happen at once, with no confirmation.
- Unchecking a task sets `completedAt` to `null`. It goes back to its place by creation time.
- "Mark all complete" is hidden when there are no tasks. "Clear completed" is hidden when there are no completed tasks.
- The filter (All / Active / Completed) resets to All on reload. Do not save it.
- Storage problems show a warning that does not block the app, and never crash it. If saved data is corrupted, do not overwrite it until the user makes a change.
- Sign up does not log the user in. It switches to the log in form with the username filled in.

**Out of scope** (see PRD §5): storing tasks per account or on the server, sharing, password reset, email verification, social log in, due dates, tags, search, reordering, syncing between tabs. Do not add these.

## Working conventions

- Every PRD acceptance criterion needs at least one test.
- Keep it simple. Prefer clear code over clever tricks, and explain choices that are not obvious.
- When scope or words change, update `docs/PRD.md`, `GLOSSARY.md` and `README.md` too (README holds the API table and the Azure deployment steps).
- If the requirements are unclear or missing, use the `grilling` skill (or `grill-with-docs`) to ask the user questions before writing code. Use `domain-modeling` when editing `GLOSSARY.md`. These skills are in `.agents/skills/`.
