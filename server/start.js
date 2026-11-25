// Shared start-up for server/index.js (Azure) and server/dev.js (local).
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createUserStore } from './db.js';
import { createApp } from './app.js';

const DIST_DIR = fileURLToPath(new URL('../dist', import.meta.url));

export function startServer({ production }) {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const app = createApp({
    userStore: createUserStore(config.dbConnectionString),
    jwtSecret: config.jwtSecret,
    secureCookies: production,
    trustProxy: production,
    // Locally, Vite serves the React app; on Azure, Express serves the built dist/.
    staticDir: production ? DIST_DIR : null,
  });

  app.listen(config.port, () => {
    console.log(`Server (${production ? 'production' : 'development'}) on port ${config.port}`);
  });
}
