import { randomBytes } from "node:crypto";
import { expect, request, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { ADMIN, API_URL } from "./stack";

/**
 * Test data is created through the real API, never by writing to the database: a row the API
 * would refuse to create is a row no user can reach, and a test built on one proves nothing.
 * Each test makes what it needs under a unique name, so tests never share state and can run in
 * any order, in parallel, against a database that keeps every previous run's data.
 */

/** A short suffix unique across workers and runs: time first (sortable), then randomness. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
}

export interface Credentials {
  email: string;
  username: string;
  password: string;
}

/** Long enough for production's 8-character floor, and not on the common-password list. */
const PLAYER_PASSWORD = "Tidal-Orbit-4417";

/** A fresh identity no account has used yet. `test` in the domain keeps it undeliverable. */
export function newCredentials(): Credentials {
  const suffix = uniqueSuffix();
  return {
    email: `player-${suffix}@e2e.oxygenquiz.test`,
    username: `player_${suffix}`,
    password: PLAYER_PASSWORD,
  };
}

/** Throws with the response body, so a failed setup call says why instead of just "expected ok". */
async function ok<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>, what: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${what} failed: HTTP ${response.status()} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

type Lookup = { id: number };
type LookupSet = { categoryId: number; languageId: number; difficultyId: number };

/** One question of a quiz the tests build — the answer is part of the definition. */
export type QuestionSpec =
  | { type: "MultipleChoice"; text: string; options: { text: string; isCorrect: boolean }[] }
  | { type: "TrueFalse"; text: string; answer: boolean }
  | { type: "TypeTheAnswer"; text: string; answer: string };

export interface CreatedQuiz {
  id: number;
  title: string;
  questions: readonly QuestionSpec[];
}

/**
 * The API as the seeded SuperAdmin. Worker-scoped: one sign-in per worker, reused by every test
 * that needs to mint an invite code or build a quiz.
 */
export class AdminApi {
  private lookups?: LookupSet;

  private constructor(private readonly http: APIRequestContext) {}

  static async signIn(): Promise<AdminApi> {
    const anonymous = await request.newContext({ ignoreHTTPSErrors: true });
    try {
      const { token } = await ok<{ token: string }>(
        await anonymous.post(`${API_URL}/Authentication/login`, {
          data: { email: ADMIN.email, password: ADMIN.password },
        }),
        `Signing in as the E2E admin (${ADMIN.email})`,
      );
      const http = await request.newContext({
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
      });
      return new AdminApi(http);
    } finally {
      await anonymous.dispose();
    }
  }

  async dispose(): Promise<void> {
    await this.http.dispose();
  }

  /** A single-use, plain ("User" role) invite code. Signup is invite-only (Signup:RequireInviteCode). */
  async mintInviteCode(): Promise<string> {
    const { codes } = await ok<{ codes: string[] }>(
      await this.http.post(`${API_URL}/admin/invite-codes`, {
        data: { count: 1, label: "e2e" },
      }),
      "Minting an invite code",
    );
    return codes[0];
  }

  /**
   * Registers a new player through the public signup endpoint and returns their credentials.
   *
   * Pass the browser context to leave that browser signed in: the call then goes through the
   * context's own request client, which shares its cookie jar, so the refresh-token and
   * session-hint cookies land exactly where a real signup would put them. Without one, the
   * account exists but no browser is signed in to it.
   */
  async createPlayer(signedInTo?: BrowserContext): Promise<Credentials> {
    const credentials = newCredentials();
    const inviteCode = await this.mintInviteCode();
    const client = signedInTo?.request ?? (await request.newContext({ ignoreHTTPSErrors: true }));
    try {
      await ok(
        await client.post(`${API_URL}/Authentication/signup`, {
          data: { ...credentials, inviteCode },
        }),
        `Signing up ${credentials.email}`,
      );
    } finally {
      if (!signedInTo) await client.dispose();
    }
    return credentials;
  }

  /**
   * A Public Classic quiz, created with its questions in one call through the atomic import
   * endpoint (POST /api/Quiz/ai-import — the same one the quiz builder's review step uses).
   * Public, so a signed-out guest can play it too. Sixty seconds a question: long enough that no
   * test races the clock, and the clock is not what these tests are about.
   */
  async createClassicQuiz(title: string, questions: readonly QuestionSpec[]): Promise<CreatedQuiz> {
    const { categoryId, languageId, difficultyId } = await this.sampleLookups();
    const created = await ok<{ id: number }>(
      await this.http.post(`${API_URL}/Quiz/ai-import`, {
        data: {
          title,
          description: "Created by the end-to-end suite.",
          categoryId,
          languageId,
          difficultyId,
          status: "Public",
          showFeedbackImmediately: true,
          shuffleQuestions: false,
          questions: questions.map((q, orderInQuiz) => ({
            type: q.type,
            text: q.text,
            difficultyId,
            timeLimitInSeconds: 60,
            orderInQuiz,
            ...(q.type === "MultipleChoice" && { answerOptions: q.options }),
            ...(q.type === "TrueFalse" && { correctAnswerBoolean: q.answer }),
            ...(q.type === "TypeTheAnswer" && { correctAnswerText: q.answer, acceptableAnswers: [] }),
          })),
        },
      }),
      `Creating the quiz "${title}"`,
    );
    return { id: created.id, title, questions };
  }

  /**
   * Ids of the sample lookups DbSeeder adds in Development. Resolved by name rather than
   * hard-coded, because ids depend on insertion order and "Unspecified" is seeded first.
   */
  private async sampleLookups(): Promise<LookupSet> {
    if (this.lookups) return this.lookups;
    const find = async (endpoint: string, field: string, name: string) => {
      const rows = await ok<(Lookup & Record<string, unknown>)[]>(
        await this.http.get(`${API_URL}/${endpoint}`),
        `Reading ${endpoint}`,
      );
      const row = rows.find((r) => r[field] === name);
      expect(row, `the seeded ${endpoint} "${name}" (DbSeeder, Development only)`).toBeDefined();
      return row!.id;
    };
    this.lookups = {
      categoryId: await find("QuestionCategories", "name", "Science"),
      languageId: await find("QuestionLanguages", "language", "English"),
      difficultyId: await find("QuestionDifficulties", "level", "Easy"),
    };
    return this.lookups;
  }
}
