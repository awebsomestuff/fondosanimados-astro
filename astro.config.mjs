// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  site: 'https://fondosanimados.com',
  output: 'static',
  integrations: [
    sitemap(),
    partytown({
      config: {
        // Permitir que AdSense acceda a document.cookie y otras APIs
        forward: ['dataLayer.push', 'adsbygoogle.push'],
      },
    }),
  ],
  build: {
    format: 'directory', // URLs limpias: /dragon-ball/ en vez de /dragon-ball.html
  },
  vite: {
    build: {
      assetsInlineLimit: 0, // No inline assets
    },
  },
});
