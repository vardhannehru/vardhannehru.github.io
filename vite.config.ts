import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
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
      // No secrets are passed into the site's code: anything put here is readable by every visitor.
      assetsInclude: ['**/*.glb'],
      build: {
        rollupOptions: {
          output: {
            // The big libraries in their own files, so the browser downloads them side by side with the site's
            // code, and they stay cached when only the site's code changes. (Packaging only: the same code runs.)
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (/node_modules[\\/]three[\\/]/.test(id)) return 'vendor-three';
              if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
              if (/node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'vendor-motion';
              if (/node_modules[\\/]gsap[\\/]/.test(id)) return 'vendor-gsap';
              if (/node_modules[\\/](react-router|react-router-dom)[\\/]/.test(id)) return 'vendor-router';
              return undefined;
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
