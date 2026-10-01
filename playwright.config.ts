import { mkdirSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import {
  API_URL,
  REPO_ROOT,
  TLS,
  WEB_PORT,
  WEB_URL,
  apiServerEnv,
  webServerEnv,
} from "./e2e/support/stack";

/**
 * End-to-end tests: a real browser against the real API and a real PostgreSQL database — no
 * mocked network. What they catch is what the unit suites cannot: the SPA and the API
 * disagreeing, cookies and CORS, route guards, and whole flows that only break end to end.
 *
 *   npm run test:e2e        run the suite (starts the API and the SPA if they aren't running)
 *   npm run test:e2e:ui     Playwright's UI mode, for writing and debugging tests
 *
 * Needs PostgreSQL on localhost:5433 (docker compose -f docker-compose.dev.yml up -d), the .NET 8
 * SDK and a Playwright browser (npx playwright install chromium). The stack runs on its own ports
 * and database — see e2e/support/stack.ts and docs/development/e2e-testing.md.
 */
const CI = !!process.env.CI;

// `dotnet dev-certs https --export-path` won't create the folder it writes into.
mkdirSync(path.dirname(TLS.cert), { recursive: true });

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results/e2e",

  // Every test builds its own data (e2e/support/api.ts), so nothing orders them.
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // One API instance and one dev server serve every worker; more than this mostly queues.
  workers: CI ? 2 : undefined,

  // Generous: the first visit to a route makes the Vite dev server compile it.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL: WEB_URL,
    // The stack serves the ASP.NET development certificate, which CI never trusts.
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      name: "Web",
      // Export the ASP.NET dev cert (creating it if this machine has none yet), then serve the SPA
      // over it; vite.config.ts reads the two files through E2E_TLS_CERT/KEY. Listed before the
      // API because Kestrel needs that same certificate to start.
      command:
        `dotnet dev-certs https --export-path "${TLS.cert}" --format Pem --no-password` +
        ` && npx vite --port ${WEB_PORT} --strictPort`,
      cwd: REPO_ROOT,
      url: WEB_URL,
      ignoreHTTPSErrors: true,
      env: webServerEnv(),
      timeout: 120_000,
      reuseExistingServer: !CI,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      name: "API",
      // Release, not Debug: a Visual Studio debugging session holds bin/Debug open, and a second
      // build into it fails. `--no-launch-profile` so launchSettings.json can't override the port.
      command: "dotnet run --project OxygenBackend/QuizAPI --configuration Release --no-launch-profile",
      cwd: REPO_ROOT,
      url: `${API_URL}/Authentication/auth-config`,
      ignoreHTTPSErrors: true,
      env: apiServerEnv(),
      // First run restores, builds and migrates a new database.
      timeout: 300_000,
      reuseExistingServer: !CI,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
