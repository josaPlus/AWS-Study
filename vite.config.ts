import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' hace que el mismo build funcione en Render (raíz) y en GitHub Pages (subcarpeta).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
