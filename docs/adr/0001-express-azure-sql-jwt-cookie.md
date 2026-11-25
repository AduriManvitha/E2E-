# Express + Azure SQL, with a JWT session in an httpOnly cookie

Accounts need a server and a shared database, so we added a Node.js + Express API (same language and tooling as the React front end) backed by Azure SQL Database on the project's existing server, `devportalsqlserver`, and Key Vault, `Kv-customappsdemo`. Passwords are hashed with bcrypt. After log in, the session is a signed JWT in an httpOnly, Secure, SameSite=Lax cookie, so page scripts can't read it. The connection string only ever comes from the `DB_CONNECTION_STRING` environment variable, which on Azure is a Key Vault reference.

## Considered Options

- **.NET (ASP.NET Core)** for the API: strong Azure fit, but a second language and toolchain for a learning project.
- **PostgreSQL / MySQL on Azure**: fine, but the team's existing server is Azure SQL.
- **JWT returned in the JSON body** (stored in `localStorage`): simpler, but any injected script could steal it.

## Consequences

- Tasks are still stored in `localStorage`, so they belong to the browser, not the account. Moving tasks to the database is a separate decision.
- `/register` doesn't log the user in. They log in right after signing up.
- Production mode is chosen by the entry point (`server/index.js`), not by `NODE_ENV`. Setting `NODE_ENV=production` on Azure would make the build skip Vite, which is a dev dependency.
