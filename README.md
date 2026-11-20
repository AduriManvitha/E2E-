# Tasks: a simple to-do list

A single-user to-do list built with React, Vite and Tailwind CSS as a learning project. Tasks are saved in your browser's `localStorage`. There is no server and no login.

**Features:** add, edit (double-click or Edit), delete, mark completed, filter (All / Active / Completed), mark all complete, and clear completed. See [docs/PRD.md](docs/PRD.md) for the full requirements.

## Getting started

Requires Node.js 20+.

**Easiest (Windows):** double-click `start.bat`. It installs dependencies the first time, starts the app and opens it in your browser. Close the window to stop it.

Or from a terminal:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Scripts

| Command            | What it does                                                                     |
| ------------------ | -------------------------------------------------------------------------------- |
| `npm run dev`      | Start the dev server                                                             |
| `npm run build`    | Build for production into `dist/`                                                |
| `npm test`         | Unit and component tests (Vitest + React Testing Library)                        |
| `npm run test:e2e` | End-to-end tests (Playwright). Run `npx playwright install chromium` once first. |
| `npm run lint`     | ESLint                                                                           |
| `npm run format`   | Prettier                                                                         |

## How the code is organised

```
src/
  domain/tasks.js          pure task logic: validation, add/edit/toggle/delete, sorting, filtering
  storage/taskStorage.js   the only code that reads/writes localStorage
  components/              presentational React components
  App.jsx                  holds the state and wires everything together
e2e/                       Playwright tests
```

## Claude Code skills

The project uses the `grill-me`, `grill-with-docs`, `grilling` and `domain-modeling` skills from [mattpocock/skills](https://github.com/mattpocock/skills). Their files are committed in `.agents/skills/`, and `skills-lock.json` pins the version. Claude Code reads skills from `.claude/skills/`, which holds machine-specific links and is not committed. After cloning, run this once to recreate them:

```bash
npx skills add https://github.com/mattpocock/skills --skill grill-me
npx skills add https://github.com/mattpocock/skills --skill grill-with-docs
npx skills add https://github.com/mattpocock/skills --skill grilling
npx skills add https://github.com/mattpocock/skills --skill domain-modeling
```

Known limitation: if the app is open in two tabs, the last tab to save wins.
