import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.RADISHKIT_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        headers: {
          Authorization: `Bearer ${process.env.RADISHKIT_SERVICE_TOKEN || ''}`,
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
