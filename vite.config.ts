import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relative asset paths so the itch.io HTML5 upload works from a subpath
  plugins: [react()],
  resolve: {
    // @react-three/lightmap is linked from a local checkout with its own
    // nested node_modules - force a single react/three/fiber instance app-wide
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber']
  }
});
