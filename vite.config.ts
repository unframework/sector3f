import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relative asset paths so the itch.io HTML5 upload works from a subpath
  plugins: [react()]
});
