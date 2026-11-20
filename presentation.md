# My To-Do List App: Built with Claude Code

_Talking notes. Written so I can say them out loud._

---

## 1. Why I chose a to-do list app

- **Simple scope.** Everyone knows what a to-do list does, so I could focus on _how_ I built it, not on explaining the idea.
- **It covers the basics.** Even a small app needs a UI, state, saving data, validation, error handling and tests.
- **It's easy to explain.** You can see every feature in a two-minute demo.

---

## 2. Project overview

**What it does.** It's a single-user to-do list that runs in the browser on my own machine. I can:

- Add a task
- Edit a task (double-click it or click Edit)
- Delete a task
- Mark a task completed, or active again
- Filter by All / Active / Completed
- Mark all complete (it also works in reverse)
- Clear all completed tasks

Tasks are saved in the browser, so they're still there after a reload.

**Tech stack and why I chose it:**

| Tool                           | Why                                                              |
| ------------------------------ | ---------------------------------------------------------------- |
| JavaScript                     | Fewer new concepts than TypeScript for a learning project        |
| React + Vite                   | Teaches components and state; Vite starts fast                   |
| Tailwind CSS                   | Styling with utility classes, no separate CSS files              |
| localStorage                   | No server needed. The simplest way to save data                  |
| Vitest + React Testing Library | Fast unit and component tests that fit with Vite                 |
| Playwright                     | Tests in a real browser, including "reload and it's still there" |
| ESLint + Prettier              | Keeps the code clean and consistent                              |

---

## 3. The workflow I followed

I followed a simple SDLC: **requirements → design → plan → build → test → document.**

1. **Setup.** I installed four community skills with `npx skills add`: `grill-me`, `grill-with-docs`, `grilling` and `domain-modeling`.
2. **PRD drafting.** I asked Claude to write `docs/PRD.md` before any code: problem, goals, users, core functions, out of scope, user stories with acceptance criteria, tech stack, data model, endpoints, folder structure and success criteria.
3. **Grilling.** Claude used the grilling skills to interview me in **6 rounds** about gaps, assumptions and edge cases. We made **22 decisions**. Examples:
   - Frontend-only, saving to localStorage
   - Completed tasks sink to the bottom
   - Editing a title to empty is rejected, not treated as a delete
   - Delete happens immediately, with no confirmation
   - I added "Mark all complete" and "Clear completed" to the scope
4. **Docs update.** The PRD went from draft v0.1 to v1.0 with a decision log. Claude also wrote `CLAUDE.md` and created `GLOSSARY.md`.
5. **/init.** I refreshed `CLAUDE.md` so it reads as guidance for Claude Code: commands, architecture and rules.
6. **Planning step.** I didn't use plan mode; section 4 explains why. Instead, I told Claude to _stop and wait for my approval_ before writing any code. After I approved, the build followed a 6-step plan:
   - Check Node and set up config
   - Install dependencies
   - Write the domain and storage code with tests
   - Build the components and the App with tests
   - Add Playwright tests
   - Run lint and all the tests
7. **Build and test.** Claude built the app, I tested it in the browser, and I added a `start.bat` so the app starts with a double-click.

**Where it stands now:**

- 51 unit/component tests pass
- 8 end-to-end tests pass
- Lint has no errors
- The production build works
- No known bugs

---

## 4. Why I used skills

- **Skills give Claude a repeatable process** instead of me writing long prompts every time.
- **`grilling`** made Claude _ask before building_. Each round had numbered questions with a recommended answer, so I only had to say yes or change it. That caught things I hadn't thought about, like what happens if the saved data is corrupted.
- **`grill-me` / `grill-with-docs`** are shortcuts. `grill-with-docs` combines grilling with `domain-modeling`.
- **`domain-modeling`** made us agree on words. We picked **"Task"**, not "todo" or "item", and wrote it in `GLOSSARY.md`. It also checks whether a decision needs an ADR (Architecture Decision Record). None of ours did, because none of them were hard to reverse.

### Why skills instead of plan mode

Plan mode in Claude Code is for planning _how_ to build something you've already defined. Claude reads the code, proposes a plan, and doesn't edit any files until you approve it.

My problem came earlier than that: I didn't yet know _what_ to build in detail. So skills were the better fit.

- **I had gaps in my requirements, not in my plan.** Grilling asked me 22 questions about decisions only I could make. A plan alone would have filled those gaps with guesses.
- **The output lasts.** Grilling and domain-modeling put the answers into files: the PRD decision log, `CLAUDE.md` and `GLOSSARY.md`. Those files guide every future session. A plan only lives in the conversation.
- **There was no code to plan against yet.** The folder was empty apart from the skills, so there was nothing for plan mode to read.
- **I still got the safety of plan mode.** I told Claude to stop and wait for my approval before writing any code. Once I approved, the build followed a clear 6-step plan.

Next time, for a change to existing code (for example a v2 feature), I would use plan mode _after_ grilling: grilling to decide **what**, then plan mode to decide **how**.

---

## 5. CLAUDE.md explained

`CLAUDE.md` is the project's instruction file for Claude Code. Claude reads it at the start of every session, so it doesn't forget the rules.

What mine contains:

- **What the project is**, with links to the PRD and glossary as the source of truth
- **Current status**: v1 is built, plus where the tests are
- **Commands**: dev, build, test, e2e tests, lint, format
- **Architecture**: which file does what
- **Rules**:
  - Always use the word "Task"
  - Titles are 1–200 characters
  - Escape cancels an edit
  - The filter resets on reload
  - What's out of scope
- **Working conventions**:
  - Every acceptance criterion needs a test
  - Keep it simple
  - Update the docs when scope changes
  - Use the grilling skill if the requirements are unclear

---

## 6. Architecture

Data flows one way: **App → domain functions → state → storage.**

```
src/
  domain/tasks.js          pure logic: validate, add, edit, toggle, delete, sort, filter
  storage/taskStorage.js   the ONLY file that touches localStorage
  components/              display only: TaskInput, TaskList, TaskItem, FilterBar, ToggleAll
  App.jsx                  holds the state, calls the logic, saves after every change
e2e/tasks.spec.js          Playwright tests
```

Key ideas:

- **Pure domain logic.** There's no React and no storage in `tasks.js`, so it's easy to test.
- **One storage boundary.** If I add a real backend later, I only replace `taskStorage.js`.
- **Storage never crashes the app.** It returns an error code, and the app shows a warning.
- **Order is calculated, never saved.** Active tasks come first, newest first. Then completed tasks, most recently completed first.
- **A Task** has an id, a title, completed, createdAt and completedAt.

---

## 7. How to run it locally

**Easiest:** double-click **`start.bat`**. It installs everything the first time, starts the app and opens the browser.

**Or from a terminal:**

```
npm install
npm run dev        # open http://localhost:5173
npm test           # unit + component tests
npm run test:e2e   # Playwright (first time: npx playwright install chromium)
npm run lint
```

---

## 8. Challenges and how I solved them

- **"Local db" was unclear.** I said "frontend-only but local db". The grilling skill caught this: a real database needs a server. I chose localStorage, so the PRD's "API endpoints" section became a small **Storage API** instead.
- **Escape could save the edit by mistake.** Some browsers fire a "lost focus" event when the edit box closes, and that event saves. A small guard in `TaskItem` makes sure Escape always cancels.
- **An end-to-end test failed on the first run.** The button "Active" also matched the Edit and Delete buttons on a task called "Active one". The app was fine; the fix was exact name matching in the test.
- **A lint warning about Fast Refresh.** A component file was also exporting error messages. I moved them to `titleErrors.js`.
- **Tests that depend on time.** Tasks added in the same millisecond could sort in a random order. In the tests I control the clock and move it forward one second per action.
- **Corrupted saved data.** The app does _not_ save when it loads, so broken data is only replaced after the user actually makes a change.
- **Slow setup.** The Playwright browser download took over 10 minutes, so it ran in the background while other work continued.

---

## 9. Key learnings and next steps

**What I learned:**

- **Write the requirements first.** The PRD and acceptance criteria made the build and the tests straightforward.
- **Let the AI question you before it builds.** Grilling turned my vague assumptions into clear decisions.
- **Keep the logic, storage and UI separate.** It makes testing and future changes much easier.
- **Test at different levels.** Unit tests cover the logic, component tests cover the user stories, and Playwright covers the real browser.
- **CLAUDE.md keeps Claude on track** across sessions.

**Next steps:**

- Put the project in git and make a first commit (not done yet)
- Run Prettier on the markdown docs (it flags formatting in the PRD and README)
- For v2 changes: grill first, then use plan mode before building
- Possible v2 features from the out-of-scope list: syncing between tabs, due dates, tags, search
- Swap localStorage for a real backend API, which is easy thanks to the storage boundary
