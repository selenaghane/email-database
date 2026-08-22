import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// TODO: replace with your actual GitHub Pages site/base once the repo is created there.
export default defineConfig({
  site: 'https://example.github.io',
  base: '/email-database',
  integrations: [tailwind()],
});
