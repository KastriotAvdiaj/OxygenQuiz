import { useCallback, useEffect, useRef, useState } from "react";

import { clearDraft, writeDraft } from "@/lib/drafts/draft-storage";

interface UseDraftAutosaveOptions<T> {
  /** Storage slot — one per form that can hold unfinished work. */
  slot: string;
  /** The signed-in user. Without one there is nothing to scope a draft to, so nothing is written. */
  userId: string | null | undefined;
  /** Snapshot shape version; a stored draft written by another version is dropped on read. */
  version: number;
  /**
   * The live snapshot to keep.
   *
   * `null` means *there is nothing worth keeping* — an untouched form — and clears the slot
   * rather than storing an empty draft. That matters: an empty draft would offer the user a
   * restore for work they never did.
   */
  value: T | null;
  /**
   * Whether this form participates in drafts at all. Default `true`.
   *
   * Not the same thing as a `null` value, and the difference matters. `null` means *this
   * form has nothing worth keeping right now* — an untouched builder, or one the user
   * emptied — and so clears the slot. `enabled: false` means *this form is not the one that
   * owns this slot*, and touches storage not at all.
   *
   * Conflating the two is a live hazard, because a slot is shared by every mount of a form:
   * `CreateQuizForm` also renders in edit mode and inside AI review, where it keeps no
   * draft. Passing `null` there would delete the manual builder's draft — someone's
   * half-written quiz — the moment they opened an unrelated quiz to edit.
   */
  enabled?: boolean;
  /** How long to wait after the last change. Long enough to coalesce typing, short enough to lose nothing. */
  debounceMs?: number;
}

interface UseDraftAutosaveReturn {
  /** `Date.now()` of the last successful write, or `null` while nothing is stored. */
  savedAt: number | null;
  /** Drops the stored draft. Call on a successful submit, and when the user discards. */
  discard: () => void;
}

/**
 * Keeps a form's unfinished work in `localStorage` while the user is filling it in.
 *
 * This is the *write* half of draft persistence. The read half is `readDraft`, called once as
 * a `useState` initializer so a restored draft is already in place on the first render —
 * there is no Effect that copies storage into state after the fact, and so no frame where the
 * form is briefly empty. See docs/quiz/quiz-draft-persistence.md.
 *
 * <b>Why this half is an Effect.</b> `localStorage` and the document's visibility events are
 * systems outside React, which is the whole of the bar an Effect has to clear. Everything
 * else here is a ref, not state: the pending payload, the timer and the last-written value
 * change nothing on screen, and holding them in state would re-render the form on a schedule
 * the user can't see.
 *
 * <b>Flushing.</b> A debounce alone loses the last few hundred milliseconds exactly when it
 * matters — the tab is closing. So the pending write is also flushed synchronously when the
 * page is hidden (`visibilitychange`, the only signal that fires reliably on mobile), when it
 * is being unloaded or put in the back/forward cache (`pagehide`), and on unmount.
 * `beforeunload` is deliberately not used: browsers ignore its message, it does not fire
 * dependably on mobile, and `use-navigation-guard.ts` already owns it for a different job —
 * warning about work that *can't* be saved, such as an AI generation in flight.
 */
export const useDraftAutosave = <T,>({
  slot,
  userId,
  version,
  value,
  enabled = true,
  debounceMs = 400,
}: UseDraftAutosaveOptions<T>): UseDraftAutosaveReturn => {
  const [savedAt, setSavedAt] = useState<number | null>(null);

  /**
   * Serializing on every render is what lets an unchanged snapshot skip the write entirely —
   * the value is rebuilt on each render, so its identity says nothing, and only its contents
   * do. A quiz draft is kilobytes, so this is cheaper than the writes it avoids.
   */
  let serialized: string | null = null;
  if (enabled && value !== null) {
    try {
      serialized = JSON.stringify(value);
    } catch {
      // A snapshot that can't be serialized can't be a draft. Nothing to tell the user.
      serialized = null;
    }
  }

  /** Written but not yet flushed. Survives the debounce being cancelled, so a flush can find it. */
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * A snapshot the user has explicitly discarded.
   *
   * Without this, `discard()` deletes the draft and the very next render — whose value is
   * still the same discarded snapshot — writes it straight back. Suppression lifts by itself
   * as soon as the snapshot differs, so the moment the user types again the draft resumes.
   */
  const suppressedRef = useRef<string | null>(null);
  const serializedRef = useRef<string | null>(serialized);
  serializedRef.current = serialized;
  const slotRef = useRef({ slot, userId, version });
  slotRef.current = { slot, userId, version };
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending === null || !enabledRef.current) return;
    pendingRef.current = null;

    const stamped = writeDraft({ ...slotRef.current, serializedData: pending });
    // Skipped after unmount: the write is the point, and the indicator is already gone.
    if (stamped !== null && mountedRef.current) setSavedAt(stamped);
  }, []);

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  const discard = useCallback(() => {
    if (!enabledRef.current) return;
    cancelPending();
    suppressedRef.current = serializedRef.current;
    clearDraft(slotRef.current);
    if (mountedRef.current) setSavedAt(null);
  }, [cancelPending]);

  // Schedule a write whenever the snapshot's contents change.
  useEffect(() => {
    // Disabled means "not this form's slot" — no write, and above all no clear.
    if (!enabled || !userId) return;

    if (serialized === null) {
      // Nothing worth keeping — including the case where the user emptied the form back out.
      cancelPending();
      clearDraft({ slot, userId });
      setSavedAt(null);
      return;
    }

    if (serialized === suppressedRef.current) return;
    suppressedRef.current = null;

    pendingRef.current = serialized;
    timerRef.current = setTimeout(flush, debounceMs);

    return () => {
      // Cancels the *timer* only. `pendingRef` deliberately survives, so the flush on unmount
      // (below) and the flush on page-hide still have the latest snapshot to write.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, serialized, slot, userId, version, debounceMs, flush, cancelPending]);

  // Flush the moment the page goes away, rather than losing the tail of the debounce.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [flush]);

  // Declared last so its cleanup runs *after* the scheduling effect's — which cancels the
  // timer — leaving this one to write what that timer was still waiting to write.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      flush();
    };
  }, [flush]);

  return { savedAt, discard };
};
