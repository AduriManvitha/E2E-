# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A simple, single-user **to-do list web app** and a **learning project**. It runs in the browser on localhost (Vite dev server). There is no backend and no login. Tasks are saved in `localStorage`.

- [docs/PRD.md](docs/PRD.md) is the source of truth for scope and acceptance criteria (US-1 to US-8).
- [GLOSSARY.md](GLOSSARY.md) lists the domain words. Use them in code, UI text and docs.

## Current status

- v1 is built: all PRD features (US-1 to US-8) are implemented, following the folder layout in PRD §10.
- Tests: Vitest unit tests (`src/domain`, `src/storage`), React Testing Library tests for the whole app (`src/App.test.jsx`, one `describe` per user story), and Playwright end-to-end tests (`e2e/tasks.spec.js`).
- Shared UI error messages for title validation live in `src/components/titleErrors.js` (kept out of component files so React Fast Refresh works).
- First-time setup for end-to-end tests: `npx playwright install chromium`.

## Commands

- `npm run dev`: start the dev server
- `npm run build` / `npm run preview`: build and preview the production bundle
- `npm test`: run all Vitest tests once
- `npm run test:watch`: Vitest in watch mode
- `npm run test:e2e`: run Playwright tests
- `npm run lint`: ESLint
- `npm run format`: Prettier

Run one test file or one test:

```
npx vitest run src/domain/tasks.test.js
npx vitest run -t "part of the test name"
npx playwright test e2e/tasks.spec.js
```

## Tech stack

JavaScript (no TypeScript), React 19 + Vite, Tailwind CSS (all styling; no CSS files except the Tailwind import), `localStorage`, Vitest + React Testing Library (jsdom), Playwright, ESLint + Prettier.

## Architecture (the big picture)

Data flows one way: **`App.jsx` → domain functions → state → storage**.

- `src/domain/tasks.js`: **pure functions only** (no React, no storage). Holds validation, create / rename / toggle / delete / toggleAll / clearCompleted, sorting and filtering.
- `src/storage/taskStorage.js`: the **only** file that touches `localStorage`. `loadTasks()` and `saveTasks()` never throw. They return an error code: `'corrupted'` or `'unavailable'`.
- `src/components/`: presentational only. They get data and callbacks as props.
- `App.jsx`: owns the task state, calls the domain functions, saves after each change, and shows the storage warning.
- Storage key: `todo-app.tasks.v1`. The value is a JSON array of Tasks.
- Task shape: `id` (`crypto.randomUUID()`), `title`, `completed`, `createdAt` (ISO string), `completedAt` (ISO string or `null`).
- **Ordering is worked out when needed, never stored:** active tasks by `createdAt` newest first, then completed tasks by `completedAt` newest first.

## Rules to follow

**Naming**

- The word is **Task** (`task`, `tasks`, `addTask`, `TaskItem`). Never use "todo" or "item" in code or UI text.

**Behaviour**

- Titles are trimmed, 1–200 characters. Duplicates are allowed.
- Editing to an empty title is rejected and the old title stays. The task is not deleted. Escape cancels an edit.
- Delete and Clear completed happen at once, with no confirmation.
- Unchecking a task sets `completedAt` to `null`. It goes back to its place by creation time.
- "Mark all complete" is hidden when there are no tasks. "Clear completed" is hidden when there are no completed tasks.
- The filter (All / Active / Completed) resets to All on reload. Do not save it.
- Storage problems show a warning that does not block the app, and never crash it. If saved data is corrupted, do not overwrite it until the user makes a change.

**Out of scope for v1** (see PRD §5): backend, login, due dates, tags, search, reordering, syncing between tabs, deployment. Do not add these.

## Working conventions

- Every PRD acceptance criterion needs at least one test.
- Keep it simple. Prefer clear code over clever tricks, and explain choices that are not obvious.
- When scope or words change, update `docs/PRD.md` and `GLOSSARY.md` too.
- If the requirements are unclear or missing, use the `grilling` skill (or `grill-with-docs`) to ask the user questions before writing code. Use `domain-modeling` when editing `GLOSSARY.md`. These skills are in `.agents/skills/`.
