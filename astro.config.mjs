import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://selenaghane.github.io',
  base: '/email-database',
  integrations: [tailwind()],
});
