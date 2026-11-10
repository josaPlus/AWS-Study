import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' hace que el mismo build funcione en Render (raíz) y en GitHub Pages (subcarpeta).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // El banco de preguntas es grande a propósito; va en su propio chunk para que el navegador lo cachee aparte.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/')) return 'contenido';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
