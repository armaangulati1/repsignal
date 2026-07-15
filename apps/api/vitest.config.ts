import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // The suite is fully offline. No test may call the live Anthropic API.
    globals: false,
  },
});
