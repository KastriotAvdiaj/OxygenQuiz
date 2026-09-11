/**
 * draft-storage.ts
 * ----------------
 * The one place that reads and writes *unfinished* work to `localStorage`, so that a refresh,
 * a closed tab or a crash doesn't cost the user what they had typed.
 *
 * This is the local half of draft persistence — see docs/quiz/quiz-draft-persistence.md for
 * why there are two halves and what the server half is for. Local is the crash-proof layer:
 * it writes in milliseconds and works offline, and it is the fallback whenever a save to the
 * server hasn't landed yet.
 *
 * Three rules live here and nowhere else, because each of them is easy to get wrong once and
 * then get wrong everywhere:
 *
 * 1. **A slot is scoped to a user.** `localStorage` is scoped to the *origin*, not to the
 *    signed-in account, and nothing clears it at logout — the common exits are an expired
 *    token or a closed tab, not a logout click. Share one key between accounts and the next
 *    person to sign in on a shared machine is offered the previous one's half-written quiz,
 *    which they can then publish under their own name. `use-lobby-connection.ts` guards the
 *    same hazard by comparing the stored username to the current one; putting the id in the
 *    key instead leaves no comparison to forget. It also means a draft survives a session
 *    expiry and comes back to the person who wrote it.
 * 2. **A slot is versioned.** A snapshot mirrors the shape of a form, and forms change. A
 *    draft written by an older shape is dropped rather than hydrated into a form that no
 *    longer matches it.
 * 3. **A slot expires.** A draft is a rescue from an accident a moment ago, not an archive.
 *    Past {@link MAX_DRAFT_AGE_MS} it is dropped on read, so nobody is offered work they
 *    abandoned a month ago and have long since forgotten writing.
 *
 * Everything here is defensive. Storage can be full, disabled by the browser, or hold
 * something a different version of the app wrote, and `localStorage` throws outright in some
 * privacy modes. A draft is a convenience and never load-bearing, so every failure degrades
 * to "there is no draft" rather than to an error the user has to read.
 */

/** A draft as it sits in storage: the payload plus the two things we check before trusting it. */
export interface StoredDraft<T> {
  /** The snapshot shape this was written by. A mismatch means drop it. */
  version: number;
  /** `Date.now()` at the moment of the write. Drives expiry and the "saved just now" line. */
  savedAt: number;
  data: T;
}

/** How long an untouched draft stays offerable. Beyond this, reads drop it. */
export const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * `oxygenquiz:draft:<user id>:<slot>`.
 *
 * The user id is not decoration — see rule 1 in the file header.
 */
const draftKey = (slot: string, userId: string) =>
  `oxygenquiz:draft:${userId}:${slot}`;

/**
 * `localStorage`, or `null` where it can't be used.
 *
 * Merely *touching* `window.localStorage` throws in Safari's private mode and wherever site
 * data is blocked, so the access itself is guarded — a `typeof window` check is not enough.
 */
const storage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

interface ReadDraftOptions<T> {
  slot: string;
  /** `null` when the signed-in user isn't known yet — there is no draft to read without one. */
  userId: string | null | undefined;
  version: number;
  /**
   * Validates the stored payload and returns it, or `null` to reject it.
   *
   * Stored JSON is untrusted input: it was written by an older build, or hand-edited in
   * devtools. Rejecting here is the same instinct as `use-lobby-connection.ts` validating a
   * stored session against the server before trusting it — hydrated data gets checked, never
   * assumed. Like every client-side check in this codebase it mirrors the API's rules and is
   * never the rule itself; the API is still the gate when the draft is finally submitted.
   */
  parse: (raw: unknown) => T | null;
}

/**
 * Reads a draft, or returns `null` when there isn't a usable one — missing, unparseable,
 * written by another version, expired, or rejected by `parse`.
 *
 * A rejected draft is also *deleted*, so a snapshot the app can no longer read stops taking
 * up the slot (and the user's quota) forever.
 */
export const readDraft = <T,>({
  slot,
  userId,
  version,
  parse,
}: ReadDraftOptions<T>): StoredDraft<T> | null => {
  const store = storage();
  if (!store || !userId) return null;

  const key = draftKey(slot, userId);

  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  const drop = () => {
    try {
      store.removeItem(key);
    } catch {
      /* nothing useful to do — the read already failed */
    }
    return null;
  };

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return drop();
  }

  if (
    typeof envelope !== "object" ||
    envelope === null ||
    (envelope as StoredDraft<unknown>).version !== version ||
    typeof (envelope as StoredDraft<unknown>).savedAt !== "number"
  ) {
    return drop();
  }

  const { savedAt, data } = envelope as StoredDraft<unknown>;

  // A clock that jumped backwards would otherwise make a draft look like it was saved in the
  // future and keep it alive forever, so the comparison is on absolute distance.
  if (Math.abs(Date.now() - savedAt) > MAX_DRAFT_AGE_MS) return drop();

  const parsed = parse(data);
  if (parsed === null) return drop();

  return { version, savedAt, data: parsed };
};

interface WriteDraftOptions {
  slot: string;
  userId: string | null | undefined;
  version: number;
  /** Already-serialized payload. The caller has it to hand and it is how it detects no-op writes. */
  serializedData: string;
}

/**
 * Writes a draft and returns the `savedAt` it stamped, or `null` if the write didn't happen.
 *
 * A full quota is the one failure worth naming: quiz drafts are kilobytes, so hitting it
 * means something else on the origin filled the store. There is nothing useful to tell the
 * user at that moment — they didn't ask for this save — so it fails quietly and the next
 * write tries again.
 */
export const writeDraft = ({
  slot,
  userId,
  version,
  serializedData,
}: WriteDraftOptions): number | null => {
  const store = storage();
  if (!store || !userId) return null;

  const savedAt = Date.now();
  try {
    store.setItem(
      draftKey(slot, userId),
      `{"version":${version},"savedAt":${savedAt},"data":${serializedData}}`,
    );
    return savedAt;
  } catch {
    return null;
  }
};

/** Removes one slot. Called on a successful submit and when the user discards a draft. */
export const clearDraft = ({
  slot,
  userId,
}: {
  slot: string;
  userId: string | null | undefined;
}): void => {
  const store = storage();
  if (!store || !userId) return;
  try {
    store.removeItem(draftKey(slot, userId));
  } catch {
    /* best effort */
  }
};
