import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development the API runs separately (`npm run server`, port 3001).
    // Vite forwards these paths to it, so the browser sees one origin and the
    // login cookie just works.
    proxy: Object.fromEntries(
      ['/register', '/login', '/logout', '/me'].map((path) => [path, 'http://localhost:3001']),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js'],
  },
});
