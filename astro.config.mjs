// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { responsiveMediaPlugin } from './src/build/responsiveMediaPlugin';

// @ts-ignore This Node configuration runs without project Node types.
const isE2eDevServer = process.env.NULO_E2E_VITE === '1';

// https://astro.build/config
export default defineConfig({
  site: 'https://astanula.github.io',
  base: '/nulocake',
  server: {
    port: 4321,
    host: '127.0.0.1',
  },
  vite: {
    ...(isE2eDevServer ? { cacheDir: './node_modules/.vite-e2e' } : {}),
    plugins: [responsiveMediaPlugin(), tailwindcss()],
    optimizeDeps: {
      ...(isE2eDevServer ? { force: true } : {}),
      // Astro's client scripts and transition virtual modules are missed by Vite's initial scan.
      include: [
        'gsap',
        'gsap/ScrollTrigger',
        'astro/virtual-modules/transitions-router.js',
        'astro/virtual-modules/transitions-types.js',
        'astro/virtual-modules/transitions-events.js',
        'astro/virtual-modules/transitions-swap-functions.js',
      ],
    },
  }
});