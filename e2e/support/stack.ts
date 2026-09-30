import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The end-to-end stack, in one place: where the API and the SPA listen, which database the API
 * uses, who the seeded admin is, and every setting the API is started with.
 *
 * It is deliberately NOT the dev stack. It listens on its own ports (7253 / 5273, not 7153 / 5173)
 * and writes to its own database (`OxygenQuiz_E2E`), so a test run never touches your development
 * data and can run while `npm run dev` and the API are up. Every value can be overridden through
 * an `E2E_*` environment variable — CI uses that for the connection string.
 *
 * See docs/development/e2e-testing.md.
 */

const env = process.env;

/** The repository root: this file lives at e2e/support/. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const WEB_PORT = Number(env.E2E_WEB_PORT ?? 5273);
export const API_PORT = Number(env.E2E_API_PORT ?? 7253);

export const WEB_URL = `https://localhost:${WEB_PORT}`;
/** The API base, with the `/api` prefix the SPA's VITE_API_URL also carries. */
export const API_URL = `https://localhost:${API_PORT}/api`;

/**
 * The database the E2E API migrates and seeds on startup. Same server as docker-compose.dev.yml
 * (localhost:5433, postgres/123), different database — EF creates it on first run.
 */
export const DB_CONNECTION =
  env.E2E_DB_CONNECTION ??
  "Host=localhost;Port=5433;Database=OxygenQuiz_E2E;Username=postgres;Password=123";

/**
 * The SuperAdmin the API seeds on first start (DbSeeder). The seeder only creates the row when it
 * is missing, so changing the password here after the first run needs a fresh E2E database.
 */
export const ADMIN = {
  username: env.E2E_ADMIN_USERNAME ?? "e2e-admin",
  email: env.E2E_ADMIN_EMAIL ?? "admin@e2e.oxygenquiz.test",
  password: env.E2E_ADMIN_PASSWORD ?? "E2e-Admin-Pa55word",
} as const;

/**
 * The SPA is served over the API's own certificate — the ASP.NET dev cert, exported to PEM by the
 * web server command in playwright.config.ts. Written under e2e/.tls/, which is gitignored.
 */
export const TLS = {
  cert: path.join(REPO_ROOT, "e2e", ".tls", "localhost.pem"),
  key: path.join(REPO_ROOT, "e2e", ".tls", "localhost.key"),
} as const;

/**
 * Environment for `dotnet run`. Environment variables beat appsettings AND user-secrets, which is
 * what makes this safe on a developer machine: the blanked secrets below are the ones that would
 * otherwise leak in from `dotnet user-secrets` and make the suite send real email or spend real
 * AI budget.
 */
export function apiServerEnv(): Record<string, string> {
  return {
    // Development: the seeder adds the sample lookups (English, Science, Easy, …) the tests
    // build quizzes from, and the relaxed password minimum applies.
    ASPNETCORE_ENVIRONMENT: "Development",
    ASPNETCORE_URLS: `https://localhost:${API_PORT}`,
    ConnectionStrings__PostgresConnection: DB_CONNECTION,

    // A throwaway key: every token it signs dies with the E2E database.
    Jwt__Key: env.E2E_JWT_KEY ?? "e2e-only-signing-key--not-a-secret--0123456789",

    Seed__AdminUsername: ADMIN.username,
    Seed__AdminEmail: ADMIN.email,
    Seed__AdminPassword: ADMIN.password,

    // Replaces appsettings.Development.json's origin list (index 0 overwrites 5173).
    Cors__AllowedOrigins__0: WEB_URL,
    App__FrontendBaseUrl: WEB_URL,

    // One IP drives every request, and every page load resumes its session through /refresh,
    // which sits in the 10-a-minute `auth` policy. appsettings.Development.json already turns the
    // limits off; said again here so the suite doesn't depend on that file's local default.
    RateLimiting__Enabled: "false",

    // Hermetic: nothing in a test run may reach a third party.
    Email__Brevo__ApiKey: "",
    Ai__Enabled: "false",
    Ai__ApiKey: "",
    Auth__BreachedPasswordCheck__Enabled: "false",
    Authentication__Google__Enabled: "false",
    Authentication__Microsoft__Enabled: "false",
  };
}

/** Environment for the Vite dev server. A VITE_* variable in the environment beats .env files. */
export function webServerEnv(): Record<string, string> {
  return {
    VITE_API_URL: API_URL,
    E2E_TLS_CERT: TLS.cert,
    E2E_TLS_KEY: TLS.key,
  };
}
