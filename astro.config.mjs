// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import yaml from '@modyfi/vite-plugin-yaml';

// https://astro.build/config
export default defineConfig({
  site: 'https://soy-sorce.github.io',
  integrations: [mdx()],
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'ja',
    routing: {
      prefixDefaultLocale: true,
    },
  },
  vite: {
    plugins: [yaml()],
  },
});