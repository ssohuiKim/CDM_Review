// import { sveltekit } from '@sveltejs/kit/vite';
// import { defineConfig } from 'vite';

// export default defineConfig({
// 	plugins: [sveltekit()]
// });
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';



export default defineConfig({
  plugins: [
    sveltekit(),
    createHtmlPlugin() // HTML 플러그인 추가
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
});
