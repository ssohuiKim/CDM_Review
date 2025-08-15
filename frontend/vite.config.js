import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ['svelte-popperjs']
	},
	resolve: {
		alias: {
			"@@": path.resolve(__dirname, "./src/"),
		},
	},
});
