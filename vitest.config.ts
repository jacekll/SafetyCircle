import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
    },
  },
  test: {
    dir: 'test',
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
    },
  },
});
