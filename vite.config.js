import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// A short build id for graphics diagnostics, so a report says which version it came from.
let build = 'dev';
try {
  build = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch (e) { /* not a git checkout */ }

export default defineConfig({
  base: './',
  define: {
    __BUILD__: JSON.stringify(build),
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
});
