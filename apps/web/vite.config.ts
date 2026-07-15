import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is served from a GitHub Pages project path
// (https://armaangulati1.github.io/repsignal/), so assets must be referenced
// under `/repsignal/`. Local dev (`vite`/`vite dev`) stays at `/` for
// convenience.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/repsignal/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
}));
