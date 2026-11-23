import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' keeps asset URLs relative, so the same build works on GitHub Pages
// (served from /worldofredrising/) and from `vite preview` at the root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Several suites build a full heightfield (seconds of CPU); under parallel load the 5 s default flakes.
    testTimeout: 30000,
  },
});
