import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import packageJson from './package.json';
import { execSync } from 'node:child_process';

const gitCommitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
        experimental: {
          async: true,
        },
      },
      adapter: adapter({
        fallback: 'index.html',
      }),
    }),
  ],
  define: {
    __FRONTEND_VERSION__: JSON.stringify(packageJson.version),
    __GIT_COMMIT_HASH__: JSON.stringify(gitCommitHash),
  }
});
