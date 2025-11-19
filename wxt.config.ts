import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }),
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    permissions: [
      "storage",
      "tabs",
      "scripting",
      "activeTab",
      "cookies",
    ],
    host_permissions: ["<all_urls>"],
  },
});
