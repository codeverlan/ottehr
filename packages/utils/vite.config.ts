import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      formats: ['es'],
    },
  },
});
