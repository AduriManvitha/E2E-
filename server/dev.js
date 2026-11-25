// Local development entry point (`npm run server`).
// Settings come from .env; the React app is served by Vite, which proxies the API here.
import { startServer } from './start.js';

startServer({ production: false });
