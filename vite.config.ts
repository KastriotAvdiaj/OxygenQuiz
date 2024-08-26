import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from 'vitest/config';
import mkcert from 'vite-plugin-mkcert'


export default defineConfig({
  plugins: [react(),mkcert()],
  test: {
    environment: 'jsdom',
    globals: true, 
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})