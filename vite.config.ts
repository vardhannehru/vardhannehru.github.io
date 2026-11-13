import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Use relative paths in production builds so the app works when opened from
      // a folder (file://) or hosted under a sub-path.
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Let ngrok tunnels (*.ngrok-free.dev, *.ngrok.app, *.ngrok.io) reach the dev server. Vite blocks unknown host names.
        allowedHosts: ['.ngrok-free.dev', '.ngrok.app', '.ngrok.io'],      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      assetsInclude: ['**/*.glb'],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
