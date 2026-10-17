import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * A config for the harness alone — the `@` alias and nothing else.
 *
 * The root `vite.config.ts` is a dev-server config: it loads the React plugin and
 * `vite-plugin-mkcert`, and mkcert reaches out to GitHub while the config is being resolved.
 * A command-line script that only needs to import a TypeScript module should not depend on
 * the network being up, so the harness brings its own.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src") },
  },
});
