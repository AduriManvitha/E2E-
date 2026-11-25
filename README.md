# Tasks: a simple to-do list

A to-do list built with React, Vite and Tailwind CSS as a learning project, with a small Node.js + Express back end for **sign up and log in**. Accounts are stored in a remote **Azure SQL Database**. Tasks themselves are still saved in your browser's `localStorage`.

**Features:** sign up, log in, log out; add, edit (double-click or Edit), delete, mark completed, time spent, filter (All / Active / Completed), mark all complete, and clear completed. See [docs/PRD.md](docs/PRD.md) for the full requirements.

## How it fits together

```
Browser (React)  ──fetch──►  Express API (server/)  ──mssql──►  Azure SQL
  AuthScreen                   POST /register                    devportalsqlserver.database.windows.net
  Tasks app (localStorage)     POST /login  → httpOnly cookie    table dbo.demo_todolist_manvitha
                               POST /logout, GET /me
```

- Passwords are hashed with **bcrypt** (cost 12). The plain password is never stored or logged.
- After login the server sets a signed **JWT in an httpOnly cookie** (`session`, 8 hours, `Secure`, `SameSite=Lax`). Page scripts can't read it.
- The database connection string comes **only** from the `DB_CONNECTION_STRING` environment variable. It is never written in code. On Azure it is a **Key Vault reference**.
- Locally, Vite (port 5173) proxies the API paths to Express (port 3001). In production, Express serves both the API and the built React app.

## Getting started

Requires Node.js 22.9+ (24 LTS recommended).

1. `npm install`
2. Copy `.env.example` to `.env` (git-ignored) and fill in:
   - `DB_CONNECTION_STRING`: the value of the connection-string secret in Key Vault **Kv-customappsdemo**.
   - `JWT_SECRET`: any random string of 32+ characters, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.
3. Make sure the users table exists (see [Database table](#database-table)) and your IP is allowed in the Azure SQL server firewall.
4. Start both parts:

```bash
npm run server   # API on http://localhost:3001 (reads .env, restarts on changes)
npm run dev      # React app on http://localhost:5173
```

**Easiest (Windows):** double-click `start.bat`. It installs dependencies the first time, starts the API server in a second window, starts the app and opens it in your browser.

## API

All bodies are JSON. Errors look like `{ "error": "<code>", "fields": { "<field>": "<code>" } }`.

| Method & path    | Body                                  | Success                                 | Errors                                                                                   |
| ---------------- | ------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `POST /register` | `{ username, password, name, email }` | `201 { user }` (no cookie; log in next) | `400 invalid` (field codes), `409 taken`, `429 too-many-requests`                        |
| `POST /login`    | `{ username, password }`              | `200 { user }` + `session` cookie       | `400 invalid`, `401 invalid-credentials` (same for unknown user / wrong password), `429` |
| `POST /logout`   | none                                  | `204`, cookie cleared                   |                                                                                          |
| `GET /me`        | none (cookie)                         | `200 { user }`                          | `401 not-logged-in`                                                                      |

`user` is `{ id, username, name, email }`. The password hash is never returned.

Rules (shared by the browser and the server, in `src/domain/accounts.js`): username 3–50 letters, numbers, `.`, `_`, `-`; password 8+ characters and at most 72 bytes (bcrypt limit); name 1–100 characters; email a valid address of at most 254 characters, stored lower-case. Username and email must be unique. Sign up and log in are limited to 20 attempts per IP per 15 minutes.

## Database table

You create this yourself in the Azure SQL database (the database name is part of the connection string):

```sql
CREATE TABLE dbo.demo_todolist_manvitha (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  username      NVARCHAR(50)  NOT NULL UNIQUE,
  password_hash NVARCHAR(100) NOT NULL,
  name          NVARCHAR(100) NOT NULL,
  email         NVARCHAR(254) NOT NULL UNIQUE
);
```

The unique constraints matter: they stop two sign-ups at the same moment from creating duplicates.

## Deploy to an Azure Web App

Existing resources: SQL server `devportalsqlserver.database.windows.net`, Key Vault `Kv-customappsdemo`.

1. **Database:** create the table above. In the SQL server's _Networking_ settings, turn on _Allow Azure services and resources to access this server_.
2. **Key Vault:** the connection-string secret is `e2e-test`. The JWT key is in the secret `todolist-jwt-secret` (a random 64-character value).
3. **Web App:** create an App Service: _Publish: Code_, _Runtime: Node 24 LTS_ (or 22 LTS), _OS: Linux_. Turn on _Identity → System assigned_.
4. **Give the Web App access to Key Vault:** in `Kv-customappsdemo` → _Access control (IAM)_ → add role **Key Vault Secrets User** for the Web App's managed identity. (If the vault uses access policies instead of RBAC, add a policy with _Get_ on secrets.)
5. **App settings** (Web App → _Settings → Environment variables_):

   | Name                             | Value                                                                                                   |
   | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
   | `DB_CONNECTION_STRING`           | `@Microsoft.KeyVault(SecretUri=https://kv-customappsdemo.vault.azure.net/secrets/e2e-test/)`            |
   | `JWT_SECRET`                     | `@Microsoft.KeyVault(SecretUri=https://kv-customappsdemo.vault.azure.net/secrets/todolist-jwt-secret/)` |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` (Azure runs `npm install` and `npm run build`)                                                   |

   `e2e-test` holds the connection string; `todolist-jwt-secret` holds this app's JWT key. Leaving the version off the URI means Azure always uses the latest version. After saving, each Key Vault setting should show a green _Key vault Reference_ tick. A red one means the identity or role from step 4 is wrong.
   Do **not** set `NODE_ENV=production` here: it would make the build skip Vite (a dev dependency). Production behaviour comes from `npm start` (`server/index.js`) instead.

6. **Startup command** (_Configuration → General settings_): `npm start`. Turn on _HTTPS Only_.
7. **Deploy the code**, for example from the project folder:

   ```bash
   az login
   az webapp up --name <web-app-name> --resource-group <resource-group> --runtime "NODE:24-lts"
   ```

   or with VS Code's Azure App Service extension, a zip deploy, or a pipeline.

8. **Check:** open `https://<web-app-name>.azurewebsites.net`, sign up, log in, and confirm the new row in `dbo.demo_todolist_manvitha`. Server logs: _Monitoring → Log stream_. A message like `Missing required environment variable(s): ...` means an app setting is missing.

## Scripts

| Command            | What it does                                                                     |
| ------------------ | -------------------------------------------------------------------------------- |
| `npm run dev`      | Start the React dev server (proxies API calls to port 3001)                      |
| `npm run server`   | Start the API server for development (reads `.env`)                              |
| `npm start`        | Start the API server in production mode (serves `dist/` too; used by Azure)      |
| `npm run build`    | Build the React app for production into `dist/`                                  |
| `npm test`         | Unit, component and API tests (Vitest + React Testing Library + supertest)       |
| `npm run test:e2e` | End-to-end tests (Playwright). Run `npx playwright install chromium` once first. |
| `npm run lint`     | ESLint                                                                           |
| `npm run format`   | Prettier                                                                         |

The API tests use an in-memory user store and the Playwright tests stub the API in the browser, so **no test needs the real database**.

## How the code is organised

```
server/
  index.js / dev.js        entry points: production (Azure) / local development
  start.js                 reads config, connects the user store, starts Express
  config.js                reads DB_CONNECTION_STRING, JWT_SECRET, PORT from the environment
  app.js                   Express app: /register, /login, /logout, /me, security middleware
  auth.js                  bcrypt hashing, JWT session sign/verify
  db.js                    the only code that talks to Azure SQL (parameterised queries)
src/
  domain/tasks.js          pure task logic: validation, add/edit/toggle/delete, sorting, filtering
  domain/accounts.js       pure account validation, shared by browser and server
  storage/taskStorage.js   the only code that reads/writes localStorage
  api/authApi.js           the only browser code that calls the account API
  components/              presentational React components (incl. AuthScreen)
  Root.jsx                 shows the log in screen or the Tasks app
  App.jsx                  the Tasks app: holds task state and wires everything together
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

## Known limitations

- Tasks are stored per browser, not per account: everyone who logs in on the same browser sees the same tasks.
- If the app is open in two tabs, the last tab to save wins.
- There is no password reset or email verification yet.
