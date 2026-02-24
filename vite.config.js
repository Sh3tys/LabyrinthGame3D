import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Multi-page : index.html + character.html
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        character: resolve(__dirname, 'character.html'),
      },
    },
  },
  // Pour le dev, Vite sert automatiquement tous les .html à la racine
  server: {
    open: '/character.html', // ouvre directement la page du joueur
  },
});
