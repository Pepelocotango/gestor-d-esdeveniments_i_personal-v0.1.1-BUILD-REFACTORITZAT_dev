import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { builtinModules } from 'module';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

// Derive __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      base: './',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
          external: [
            ...builtinModules,
            'electron'
          ],
          
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
    };
});