import path from "path"
import { readFileSync } from "fs"
import react from "@vitejs/plugin-react"
import { configDefaults, defineConfig } from 'vitest/config';
import mkcert from 'vite-plugin-mkcert'

// The end-to-end stack (playwright.config.ts) serves the SPA over the same certificate the API
// uses — the ASP.NET dev cert, exported to PEM — and names the files here. mkcert is skipped then:
// its first run asks the GitHub API for a download, and unauthenticated calls from CI runners are
// rate-limited into a 403 that fails the dev server before a single test runs.
// See docs/development/e2e-testing.md.
const e2eTls =
  process.env.E2E_TLS_CERT && process.env.E2E_TLS_KEY
    ? {
        cert: readFileSync(process.env.E2E_TLS_CERT),
        key: readFileSync(process.env.E2E_TLS_KEY),
      }
    : undefined;

export default defineConfig({
  // mkcert downloads its binary from GitHub on first use. Tests need neither HTTPS nor the
  // network, so the unit suite skips it and runs anywhere, offline included.
  plugins: [react(), ...(process.env.VITEST || e2eTls ? [] : [mkcert()])],
  server: e2eTls ? { https: e2eTls } : undefined,
  test: {
    name: 'unit',
    environment: 'jsdom',
    globals: true,
    // Playwright specs are *.spec.ts too, and Vitest's default include would collect them and
    // fail on `@playwright/test` imports. They run under `npm run test:e2e`, never here.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  build: {
    // The build's content-hashed files get their own folder, so public/_headers can cache it for
    // a year (`immutable`). Vite's default, `assets/`, is also where public/assets/ (unhashed
    // images) lands, and freezing those would keep a replaced image stale for a year.
    // Guarded by src/lib/__tests__/build-cache.test.ts; docs/deployment/frontend-worker.md.
    assetsDir: "_app",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
