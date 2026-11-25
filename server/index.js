// Production entry point (`npm start`, used by the Azure Web App).
// Secure cookies, trusts the Azure proxy, and serves the built React app from dist/.
import { startServer } from './start.js';

startServer({ production: true });
