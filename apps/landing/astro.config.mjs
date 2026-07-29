// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Novarum Docs',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/novarumsocial/novarum' },
      ],
      sidebar: [
        { label: 'Introduction', slug: 'docs' },
        {
          label: 'Guides',
          items: [{ label: 'Deploy an Anchor server', slug: 'guides/deployment' }],
        },
      ],
    }),
  ],
});
