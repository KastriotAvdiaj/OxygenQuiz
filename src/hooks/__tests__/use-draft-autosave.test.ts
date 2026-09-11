import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDraftAutosave } from "../use-draft-autosave";

/**
 * The write half of draft persistence, and in particular the three ways it can quietly do the
 * wrong thing: write nothing when it should, delete a draft it does not own, or lose the last
 * few hundred milliseconds because the tab closed inside the debounce.
 */

const SLOT = "test-slot";
const KEY = `oxygenquiz:draft:user-a:${SLOT}`;
const base = { slot: SLOT, userId: "user-a", version: 1 };

const stored = () => {
  const raw = localStorage.getItem(KEY);
  return raw === null ? null : JSON.parse(raw);
};

describe("useDraftAutosave", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("writes once the user stops typing", () => {
    renderHook(() => useDraftAutosave({ ...base, value: { title: "Rivers" } }));

    expect(stored()).toBeNull(); // still inside the debounce
    act(() => void vi.advanceTimersByTime(500));

    expect(stored()?.data).toEqual({ title: "Rivers" });
    expect(stored()?.version).toBe(1);
  });

  it("clears the slot when there is nothing left worth keeping", () => {
    const { rerender } = renderHook(
      ({ value }: { value: { title: string } | null }) =>
        useDraftAutosave({ ...base, value }),
      { initialProps: { value: { title: "Rivers" } as { title: string } | null } },
    );
    act(() => void vi.advanceTimersByTime(500));
    expect(stored()).not.toBeNull();

    // The user emptied the form back out — the draft should go with it.
    rerender({ value: null });
    expect(stored()).toBeNull();
  });

  it("leaves a slot it does not own completely alone", () => {
    // The hazard: `CreateQuizForm` also renders in edit mode and inside AI review, where it
    // keeps no draft. If "disabled" were expressed as a null value it would delete the manual
    // builder's draft — someone's half-written quiz — on the way past.
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, savedAt: Date.now(), data: { title: "Someone's work" } }),
    );

    const { unmount } = renderHook(() =>
      useDraftAutosave({ ...base, enabled: false, value: null }),
    );
    act(() => void vi.advanceTimersByTime(500));
    unmount();

    expect(stored()?.data).toEqual({ title: "Someone's work" });
  });

  it("flushes a pending write when the page is hidden", () => {
    renderHook(() => useDraftAutosave({ ...base, value: { title: "Half typed" } }));

    // Mid-debounce: the tab goes away. `visibilitychange` is the signal that fires reliably
    // on mobile, where `beforeunload` does not.
    expect(stored()).toBeNull();
    act(() => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(stored()?.data).toEqual({ title: "Half typed" });
  });

  it("flushes a pending write on unmount", () => {
    const { unmount } = renderHook(() =>
      useDraftAutosave({ ...base, value: { title: "Navigating away" } }),
    );

    expect(stored()).toBeNull();
    unmount();

    expect(stored()?.data).toEqual({ title: "Navigating away" });
  });

  it("does not resurrect a discarded draft from the write it still had pending", () => {
    // The submit path: the quiz is created, the draft is discarded, and the redirect unmounts
    // the form a moment later. Without suppression the unmount flush would put it straight
    // back, and the user would be offered the quiz they just created.
    const { result, unmount } = renderHook(() =>
      useDraftAutosave({ ...base, value: { title: "Saved for real" } }),
    );
    act(() => void vi.advanceTimersByTime(500));
    expect(stored()).not.toBeNull();

    act(() => result.current.discard());
    expect(stored()).toBeNull();

    unmount();
    expect(stored()).toBeNull();
  });

  it("starts saving again once the user types after discarding", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: { title: string } }) =>
        useDraftAutosave({ ...base, value }),
      { initialProps: { value: { title: "First go" } } },
    );
    act(() => void vi.advanceTimersByTime(500));
    act(() => result.current.discard());
    expect(stored()).toBeNull();

    // Suppression is per-snapshot, so it lifts by itself the moment the contents differ.
    rerender({ value: { title: "Second go" } });
    act(() => void vi.advanceTimersByTime(500));

    expect(stored()?.data).toEqual({ title: "Second go" });
  });
});
