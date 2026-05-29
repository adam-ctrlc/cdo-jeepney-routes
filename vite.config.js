import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // GitHub Pages project sites need this base path to match the repository name.
  base: '/cdo-jeepney-routes/'
})
