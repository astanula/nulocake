// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { responsiveMediaPlugin } from './src/build/responsiveMediaPlugin';

// https://astro.build/config
export default defineConfig({
  site: 'https://astanula.github.io',
  base: '/nulocake',
  server: {
    port: 4321,
    host: '127.0.0.1',
  },
  vite: {
    plugins: [responsiveMediaPlugin(), tailwindcss()],
    optimizeDeps: {
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