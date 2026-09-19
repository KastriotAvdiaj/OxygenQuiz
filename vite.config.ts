import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from 'vitest/config';
import mkcert from 'vite-plugin-mkcert'


export default defineConfig({
  // mkcert downloads its binary from GitHub on first use. Tests need neither HTTPS nor the
  // network, so the unit suite skips it and runs anywhere, offline included.
  plugins: [react(), ...(process.env.VITEST ? [] : [mkcert()])],
  test: {
    name: 'unit',
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})