import Axios, {
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "./token-store";
import { useNotifications } from "@/common/Notifications";

declare module "axios" {
  /**
   * Per-request opt-out of the global error toast, for callers that surface the failure
   * themselves — an inline field error, a panel beside the button, a form that bounces the
   * user back to the bad step. See "Opting out of the global toast" in
   * docs/development/error-handling.md.
   *
   * Declared here, beside the interceptor that reads it, so the flag is a typed part of the
   * request config. It used to be an undeclared key that every call site passed through an
   * `as any` cast — which meant a typo silently produced a duplicate toast instead of a
   * compile error.
   */
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

/** Generic copy for a failure the user is not meant to read the details of. */
const GENERIC_ERROR = "An unexpected error occurred. Please try again.";

/**
 * Copy for a 4xx whose body is machine-generated field validation. Deliberately vague about
 * *which* field: by the time model binding rejects a request, the field names in the body are
 * C# DTO property names, and the client-side zod schema that should have caught it first
 * didn't. That's a contract bug, not something the user can act on.
 */
const FIELD_ERROR = "Some of the details weren't accepted. Please check the form and try again.";

/**
 * What the API answered with, classified by **who wrote the message**.
 *
 * That is the only question that matters for display, and — importantly — it is answerable
 * from the response alone, with no cooperation from the call site that threw.
 *
 *  - `authored`  — a person wrote this string for a person. Show it verbatim.
 *  - `generated` — a framework produced it from types and field names. Never show it.
 *  - `opaque`    — a 5xx, where the message may be an EF exception or a stack trace.
 */
type ErrorKind = "authored" | "generated" | "opaque";

interface ParsedApiError {
  kind: ErrorKind;
  /** The best message found in the body. Logged always; displayed only when `authored`. */
  message: string;
}

/**
 * Reads an error response into `{ kind, message }`.
 *
 * <b>The backend speaks four dialects</b>, and this has to read all of them:
 *
 * | Body | Written by | Kind |
 * |---|---|---|
 * | `{ message, isCustomMessage }` | `BaseApiController.HandleFailure` / `HandleCustomError` | `isCustomMessage` decides |
 * | `ProblemDetails { title }` | `GlobalExceptionHandler` — every `AppException` | authored |
 * | A bare JSON string | `BadRequest(ex.Message)` in the older controllers | authored |
 * | `ValidationProblemDetails { errors }` | `[ApiController]` model binding | generated |
 *
 * <b>The bare string is what made the AI-import 400 undiagnosable.</b> The previous reader was
 * `data?.detail || data?.title || data?.message`, which is `undefined` three times over on a
 * string body, so it fell through to axios's own "Request failed with status code 400". The
 * server had written "Pick a category for this quiz — …" and nobody ever saw it.
 *
 * <b>The `errors` key is the discriminator</b> between the two `ProblemDetails` shapes, and it
 * is reliable because it is structural rather than conventional: `GlobalExceptionHandler`
 * constructs a plain `ProblemDetails` (no `errors`), while ASP.NET's model binder constructs a
 * `ValidationProblemDetails` (always `errors`). Neither has to remember to declare anything.
 * See docs/development/error-handling.md for why this beats a per-message flag.
 */
function parseApiError(status: number | undefined, data: unknown): ParsedApiError {
  const isServerFault = status !== undefined && status >= 500;

  // ── Dialect 3: a bare string body. Only `BadRequest(ex.Message)` produces this, and only
  //    ever with a hand-written message.
  if (typeof data === "string" && data.trim()) {
    return {
      kind: isServerFault ? "opaque" : "authored",
      message: data.trim(),
    };
  }

  if (!data || typeof data !== "object") {
    return { kind: isServerFault ? "opaque" : "authored", message: "" };
  }

  const body = data as Record<string, unknown>;

  // ── Dialect 4: ValidationProblemDetails. Checked FIRST — it also carries a `title`
  //    ("One or more validation errors occurred."), so reading titles first would misfile it
  //    as authored. The first field reason is kept for the log, not for display.
  const errors = body.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .find((v): v is string => typeof v === "string" && v.trim().length > 0);

    return {
      kind: "generated",
      message: first?.trim() || readString(body, "title") || "",
    };
  }

  // ── Dialects 1 and 2.
  const message =
    readString(body, "detail") ||
    readString(body, "title") ||
    readString(body, "message") ||
    "";

  // `isCustomMessage: true` is an explicit backend override — the one case where a 5xx may
  // still be shown. It is honoured, but never *required*: the `HandleFailure` contract keeps
  // working without every other endpoint having to adopt it.
  if (body.isCustomMessage === true) return { kind: "authored", message };

  return { kind: isServerFault ? "opaque" : "authored", message };
}

/** First non-blank string property, or "" — keeps `parseApiError` readable. */
function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

/**
 * The copy to put in the toast.
 *
 * <b>Why kind and not a per-message flag.</b> The obvious alternative is a boolean set at each
 * throw site ("show this one to the user"). The codebase already has that — `isCustomMessage` —
 * and it is precisely what failed: it was opt-in, so a message without it silently became
 * "An unexpected error occurred", and nothing about that failure is visible in code review.
 * Classifying by the *shape the framework produced* needs no cooperation and cannot be
 * forgotten. Full reasoning in docs/development/error-handling.md.
 */
function displayMessageFor(parsed: ParsedApiError, fallback: string): string {
  switch (parsed.kind) {
    case "authored":
      return parsed.message || fallback;
    case "generated":
      return FIELD_ERROR;
    case "opaque":
      return GENERIC_ERROR;
  }
}

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = "application/json";

    // Retrieve the token from the in-memory store (never a cookie/localStorage).
    const token = getAccessToken();
    if (token) {
      // Attach the token to the Authorization header
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }

  config.withCredentials = true;
  return config;
}

export const llmApi = Axios.create({
  baseURL: import.meta.env.VITE_LLM_URL,
});

llmApi.interceptors.response.use(
  (response) => {
    // Axios responses have the actual data inside a `data` property.
    // This unwraps it for you, so in your hooks you can just use `response`
    // instead of `response.data`.
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * The configured axios instance: base URL, bearer token, silent 401 refresh, error toast.
 *
 * **It resolves to the full `AxiosResponse`, not the body.** Unlike `llmApi` above, the
 * success interceptor returns `response` untouched — so read `.data`, or use
 * {@link apiService}, which does it for you. Prefer `apiService` in feature code; reach for
 * `api` only when you need headers or the raw response.
 *
 * Worth stating loudly because the mistake is silent: `api.post(url, body)` annotated
 * `Promise<Thing>` compiles happily (axios infers `R` from the expected return type) and
 * then hands the caller an AxiosResponse whose `.title`, `.id`, `.prompt` are all
 * `undefined`. No error, no warning — just a page rendering "undefined".
 */
export const api = Axios.create({
  // Base URL comes from the Vite env files (already includes the /api suffix):
  //   .env.development → https://localhost:7153/api
  //   .env.production  → https://api.oxygenquiz.com/api
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use(authRequestInterceptor);

// --- Silent refresh on 401 -------------------------------------------------
// The API now actually validates JWTs, so an expired access token yields 401.
// We try the refresh-token cookie once (POST /Authentication/refresh), store the
// new access token, and replay the original request. A single-flight promise
// makes concurrent 401s share one refresh call.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  // Bare axios call so we don't re-enter this interceptor. withCredentials sends
  // the HttpOnly refresh cookie.
  const response = await Axios.post(
    `${api.defaults.baseURL}/Authentication/refresh`,
    {},
    { withCredentials: true }
  );
  const newToken: string | undefined = response.data?.token;
  if (!newToken) {
    throw new Error("Refresh did not return a token");
  }
  setAccessToken(newToken);
  return newToken;
}

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const parsed = parseApiError(status, data);
    // `error.message` is axios's own ("Request failed with status code 400") — a last resort
    // for a 4xx that answered with an empty body.
    const message = parsed.message || error.message;

    // If it's a 404, just reject the promise without a notification.
    // The loader's error handler will take care of the UI.
    if (status === 404) {
      return Promise.reject(error);
    }
    if (status === 401) {
      const originalRequest = error.config || {};
      const isRefreshCall =
        typeof originalRequest.url === "string" &&
        originalRequest.url.includes("Authentication/refresh");

      // Try a single silent refresh, then replay the original request once.
      if (!originalRequest._retry && !isRefreshCall) {
        originalRequest._retry = true;
        try {
          refreshPromise = refreshPromise ?? refreshAccessToken();
          const newToken = await refreshPromise;
          refreshPromise = null;

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          refreshPromise = null;
          console.log("Refresh failed, signing out:", refreshError);
          clearAccessToken();
          return Promise.reject(error);
        }
      }

      console.log("Unauthorized:", error);
      clearAccessToken();
    } else {
      const displayMessage = displayMessageFor(parsed, error.message);

      // Log every failure, including the ones we showed verbatim. On an `opaque` or
      // `generated` error this is the only place the real message survives; on an `authored`
      // one it saves opening the Network tab to see what the user was just told. `kind` is
      // included because "why was I shown the generic line?" is the question this answers.
      console.error("API error:", {
        status,
        kind: parsed.kind,
        message,
        shown: displayMessage,
        url: error.config?.url,
        method: error.config?.method,
      });

      // Some callers surface their own field-specific error (e.g. the signup form, which
      // shows the exact reason and bounces the user back to the bad step; or the AI wizard's
      // error panel, which offers a different next step per failure code). They set
      // `skipErrorToast` on the request so we don't also fire a duplicate generic toast.
      if (!error.config?.skipErrorToast) {
        useNotifications.getState().addNotification({
          type: "error",
          title: "Error",
          message: displayMessage,
        });
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // Basic data-only methods (for backward compatibility)
  async get<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await api.get<T>(url, config);
    return response.data;
  },

  async post<T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },

  async put<T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },

  async delete<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
  },

  // Full response methods (when you need headers or other response data)
  async getWithMeta<T = any>(
    url: string,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return api.get<T>(url, config);
  },

  async postWithMeta<T = any>(
    url: string,
    data?: any,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return api.post<T>(url, data, config);
  },

  async putWithMeta<T = any>(
    url: string,
    data?: any,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return api.put<T>(url, data, config);
  },

  async deleteWithMeta<T = any>(
    url: string,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return api.delete<T>(url, config);
  },
};
