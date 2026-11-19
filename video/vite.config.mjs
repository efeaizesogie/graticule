import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Builds the demo-video stage into video/dist, served by tools/mock-server.mjs at /stage/.
export default defineConfig({
  root: fileURLToPath(new URL('./stage', import.meta.url)),
  base: '/stage/',
  plugins: [react()],
  publicDir: fileURLToPath(new URL('./clips', import.meta.url)), // reddit-clip.mp4 is copied as-is
  build: { outDir: fileURLToPath(new URL('./dist', import.meta.url)), emptyOutDir: true },
});
