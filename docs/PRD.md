# PRD — Simple To-Do List App

> Status: **v1.0 — agreed** (after design interview, 2026-11-20). Terms follow [GLOSSARY.md](../GLOSSARY.md).

## 1. Problem Statement

People juggle many small tasks and lose track of them in their heads, sticky notes, or scattered apps. They need a fast, no-friction place to write a task down, change it, tick it off, and see what's still left.

This is also a **learning project**: the goal is to practise building a small, well-structured React app end to end — components, state, persistence, styling, and automated tests at unit, component and end-to-end level.

## 2. Goals

| #   | Goal                        | Measure                                                                                    |
| --- | --------------------------- | ------------------------------------------------------------------------------------------ |
| G1  | Capture a task in seconds   | Add a task with type + Enter                                                               |
| G2  | Keep the list accurate      | Edit, complete, delete and bulk actions persist across page reloads                        |
| G3  | Focus on what matters       | Filter by All / Active / Completed; completed tasks sink below active ones                 |
| G4  | Learn frontend fundamentals | React + Vite app, Tailwind styling, isolated storage module, Vitest/RTL + Playwright tests |

### Non-goals

- Being a production-grade product or competing with Todoist/Trello.
- Learning backend development in v1 (no server, no database server).

## 3. Target Users

- **Primary:** A single individual (the developer) managing personal tasks in a desktop browser on their own machine.
- **Secondary:** Anyone reviewing the project as a learning portfolio piece.
- Single user, no accounts, runs locally on `localhost` via the Vite dev server. Not deployed.

## 4. Core Functions

1. **Add** a task with a title.
2. **Edit** a task's title.
3. **Delete** a task.
4. **Mark completed / active** (toggle).
5. **Filter** by status: All, Active, Completed.
6. **Mark all complete** (toggle all).
7. **Clear completed** (delete all completed tasks).

## 5. Out of Scope (v1)

- Backend server, HTTP API, server-side database
- User accounts, authentication, multi-user / sharing
- Deployment / hosting
- Task description/notes, due dates, reminders, notifications
- Priorities, tags, categories, multiple lists, subtasks
- Drag-and-drop or manual reordering
- Search
- Undo / confirmation dialogs for deletion
- Syncing between multiple open browser tabs (known limitation: the last tab to save wins)
- Offline/PWA, mobile native apps, cross-device sync
- Remembering the selected filter across reloads

## 6. User Stories & Acceptance Criteria

### US-1 Add a task

_As a user, I want to add a task so I don't forget it._

- **AC1** Given the input has text, when I press Enter or click Add, the task appears at the top of the active group.
- **AC2** Given the input is empty or only whitespace, when I submit, nothing is added and an inline message is shown.
- **AC3** Leading/trailing whitespace is trimmed before saving.
- **AC4** Titles longer than 200 characters (after trimming) are rejected with an inline message.
- **AC5** Duplicate titles are allowed.
- **AC6** After adding, the input clears and keeps focus.
- **AC7** The task survives a page reload.

### US-2 Edit a task

_As a user, I want to fix a task's wording._

- **AC1** Double-clicking a task title (or clicking its Edit control) switches it to an editable field pre-filled with the current title.
- **AC2** Enter or blur saves; Escape cancels and restores the old title.
- **AC3** Saving an empty/whitespace-only title is rejected: the old title is kept and the task is **not** deleted.
- **AC4** Same validation as Add (trim, 1–200 chars).
- **AC5** Editing does not change the task's completed state or its position.

### US-3 Delete a task

_As a user, I want to remove tasks I no longer need._

- **AC1** Each task has a Delete control.
- **AC2** Clicking Delete removes the task immediately, with no confirmation.
- **AC3** Deleted tasks do not return after reload.

### US-4 Mark a task completed / active

_As a user, I want to tick off tasks I've finished._

- **AC1** Each task has a checkbox; checking it marks the task Completed (title struck through) and moves it to the **top of the completed group**, below all active tasks.
- **AC2** Unchecking returns it to Active, at its original position by creation time; its completion time is cleared.
- **AC3** State persists across reloads.

### US-5 Filter by status

_As a user, I want to see only the tasks I care about right now._

- **AC1** Filter controls: All (default), Active, Completed.
- **AC2** The selected filter is visually highlighted.
- **AC3** A counter shows the number of active tasks ("1 task left" / "N tasks left").
- **AC4** When the current filter shows no tasks, an empty-state message is displayed.
- **AC5** The filter is view state only; it resets to All on reload.

### US-6 Mark all complete (toggle all)

_As a user, I want to complete everything in one click._

- **AC1** A "Mark all complete" control is shown only when at least one task exists.
- **AC2** If any task is active, activating it marks **all** tasks completed.
- **AC3** If every task is already completed, activating it marks **all** tasks active again.
- **AC4** Resulting order follows the normal ordering rules (§8); the result persists.

### US-7 Clear completed

_As a user, I want to remove all finished tasks at once._

- **AC1** A "Clear completed" control is shown only when at least one completed task exists.
- **AC2** Activating it deletes every completed task immediately, with no confirmation.
- **AC3** Active tasks are untouched; the result persists.

### US-8 Storage failure

_As a user, I want the app to keep working even if saved data can't be read._

- **AC1** If saved data is corrupted (unparseable or wrong shape), the app starts with an empty list and shows a non-blocking warning.
- **AC2** If localStorage is unavailable (blocked, private mode, quota exceeded), the app still works in memory and shows a warning that changes may not be saved.
- **AC3** Corrupted data is not overwritten until the user makes a change.
- **AC4** The app never crashes because of storage errors.

## 7. Tech Stack

| Layer                | Choice                                               | Why                                                       |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| Language             | JavaScript (ES modules)                              | Fewer concepts at once than TypeScript                    |
| UI                   | React + Vite                                         | Components/state practice; fast dev server                |
| Styling              | Tailwind CSS (Vite plugin)                           | Utility-first styling, no custom CSS files                |
| Persistence          | Browser `localStorage` behind a `taskStorage` module | No server; simplest durable storage                       |
| Unit/component tests | Vitest + React Testing Library (jsdom)               | Native to Vite, fast                                      |
| End-to-end tests     | Playwright                                           | Real-browser checks of key flows incl. reload persistence |
| Tooling              | npm, ESLint, Prettier                                | Standard JS tooling                                       |

## 8. Data Model

### `Task`

| Field         | Type                      | Rules                                                         |
| ------------- | ------------------------- | ------------------------------------------------------------- |
| `id`          | string                    | `crypto.randomUUID()`, generated on create                    |
| `title`       | string                    | Required, trimmed, 1–200 chars, duplicates allowed            |
| `completed`   | boolean                   | Default `false`                                               |
| `createdAt`   | ISO 8601 string           | Set on create, never changes                                  |
| `completedAt` | ISO 8601 string \| `null` | Set when marked completed; reset to `null` when marked active |

### Storage format

- localStorage key: `todo-app.tasks.v1`
- Value: JSON array of `Task` objects.
- The version suffix allows a future schema migration.

### Ordering (derived, never stored)

1. Active tasks first, sorted by `createdAt` descending (newest first).
2. Then completed tasks, sorted by `completedAt` descending (most recently completed first).

## 9. Storage API (replaces HTTP endpoints)

There is no server. All persistence goes through `src/storage/taskStorage.js`, the **only** module that touches `localStorage`. Swapping it for a REST client later should not affect the components.

| Function           | Returns                                                          | Behaviour                                                                     |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `loadTasks()`      | `{ tasks: Task[], error: null \| 'corrupted' \| 'unavailable' }` | Reads and validates stored tasks; never throws. On error returns `tasks: []`. |
| `saveTasks(tasks)` | `{ ok: boolean, error: null \| 'unavailable' }`                  | Serialises and writes the whole array; never throws.                          |

Task operations are pure functions in `src/domain/tasks.js` (no React, no storage), e.g. `createTask(title)`, `validateTitle(title)`, `renameTask`, `toggleTask`, `deleteTask`, `toggleAll`, `clearCompleted`, `sortTasks`, `filterTasks(tasks, filter)`, `countActive`. The app holds tasks in React state and calls `saveTasks` after each change.

## 10. Folder Structure

```
TO-DO List/
├── docs/
│   └── PRD.md
├── src/
│   ├── main.jsx                # React entry
│   ├── App.jsx                 # state, wiring, storage warning
│   ├── App.test.jsx            # RTL tests for every user story
│   ├── test/setup.js           # Vitest setup (jest-dom, cleanup)
│   ├── index.css               # Tailwind import
│   ├── domain/
│   │   ├── tasks.js            # pure task operations + validation + sorting/filtering
│   │   └── tasks.test.js
│   ├── storage/
│   │   ├── taskStorage.js      # only code that touches localStorage
│   │   └── taskStorage.test.js
│   └── components/
│       ├── TaskInput.jsx
│       ├── TaskList.jsx
│       ├── TaskItem.jsx
│       ├── FilterBar.jsx       # filters, counter, clear completed
│       ├── ToggleAll.jsx
│       └── titleErrors.js      # UI messages for title validation errors
├── e2e/
│   └── tasks.spec.js           # Playwright
├── index.html
├── vite.config.js
├── playwright.config.js
├── package.json
├── GLOSSARY.md
├── CLAUDE.md
└── README.md
```

## 11. Success Criteria

- All seven core functions work in the browser and persist across page reloads.
- Ordering and filtering behave exactly as in §6 and §8.
- Storage failures (corrupted data, unavailable storage) show a warning and never crash the app.
- Every acceptance criterion in §6 is covered by at least one automated test (Vitest/RTL or Playwright).
- Playwright covers at least: add → reload → still there; complete → sinks below active; filter; clear completed.
- `npm install && npm run dev` starts the app; `npm test` and `npm run test:e2e` pass.
- `npm run lint` passes with no errors.

## 12. Decision Log (design interview, 2026-11-20)

| Decision                 | Choice                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Architecture             | Frontend-only; localStorage via one storage module                                                                |
| Language / UI            | JavaScript, React + Vite                                                                                          |
| Users                    | Single user, local only                                                                                           |
| Task fields              | Title only (+ completed, timestamps)                                                                              |
| Canonical term           | **Task** (not todo/item/note)                                                                                     |
| Order                    | Active newest-first; completed sink, most recently completed first; un-complete returns to creation-time position |
| Empty edit               | Rejected, old title kept                                                                                          |
| Delete / Clear completed | Immediate, no confirmation                                                                                        |
| Filter                   | Resets to All on reload                                                                                           |
| Storage failure          | Empty list + warning, no crash                                                                                    |
| Title rules              | Trim, 1–200 chars, duplicates allowed                                                                             |
| Styling                  | Tailwind CSS                                                                                                      |
| Tests                    | Vitest + RTL + Playwright                                                                                         |
| Bulk actions             | Mark all complete (toggle) + Clear completed, in scope                                                            |
| Multi-tab sync           | Out of scope                                                                                                      |
