import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En GitHub Pages la web vive en /barata-chivata/; en local, en la raíz.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/barata-chivata/' : '/',
  plugins: [react()],
})
