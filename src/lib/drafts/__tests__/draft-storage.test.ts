import { beforeEach, describe, expect, it } from "vitest";

import {
  MAX_DRAFT_AGE_MS,
  clearDraft,
  readDraft,
  writeDraft,
} from "../draft-storage";

/**
 * The rules a draft has to clear before it is allowed back into a form.
 *
 * These are the three things that go wrong quietly: a draft belonging to somebody else, a
 * draft written by a shape the app has since changed, and a draft old enough that the user
 * has forgotten writing it. None of them throws on its own — they each just hand the form
 * something it shouldn't have — so they are worth pinning down here.
 */

const SLOT = "test-slot";
const VERSION = 1;

interface Payload {
  title: string;
}

/** Accepts anything with a string `title`, exactly as the real parsers narrow their shape. */
const parsePayload = (raw: unknown): Payload | null =>
  typeof raw === "object" &&
  raw !== null &&
  typeof (raw as Payload).title === "string"
    ? { title: (raw as Payload).title }
    : null;

const store = (
  slot: string,
  userId: string,
  version: number,
  savedAt: number,
  data: unknown,
) =>
  localStorage.setItem(
    `oxygenquiz:draft:${userId}:${slot}`,
    JSON.stringify({ version, savedAt, data }),
  );

describe("draft storage", () => {
  beforeEach(() => localStorage.clear());

  it("reads back what it wrote", () => {
    writeDraft({
      slot: SLOT,
      userId: "user-a",
      version: VERSION,
      serializedData: JSON.stringify({ title: "Half a quiz" }),
    });

    const restored = readDraft<Payload>({
      slot: SLOT,
      userId: "user-a",
      version: VERSION,
      parse: parsePayload,
    });

    expect(restored?.data.title).toBe("Half a quiz");
    expect(restored?.savedAt).toBeTypeOf("number");
  });

  it("keeps one user's draft away from another", () => {
    writeDraft({
      slot: SLOT,
      userId: "user-a",
      version: VERSION,
      serializedData: JSON.stringify({ title: "Only mine" }),
    });

    // The hazard this exists for: `localStorage` is scoped to the origin, so on a shared
    // machine the next account to sign in would otherwise be offered this draft — and could
    // publish it as their own.
    const asSomeoneElse = readDraft<Payload>({
      slot: SLOT,
      userId: "user-b",
      version: VERSION,
      parse: parsePayload,
    });

    expect(asSomeoneElse).toBeNull();
    // …and the owner still has it.
    expect(
      readDraft<Payload>({
        slot: SLOT,
        userId: "user-a",
        version: VERSION,
        parse: parsePayload,
      }),
    ).not.toBeNull();
  });

  it("drops a draft written by another version, rather than hydrating a stale shape", () => {
    store(SLOT, "user-a", VERSION - 1, Date.now(), { title: "Old shape" });

    expect(
      readDraft<Payload>({
        slot: SLOT,
        userId: "user-a",
        version: VERSION,
        parse: parsePayload,
      }),
    ).toBeNull();
    // Dropped, not merely ignored — otherwise an unreadable draft holds the slot forever.
    expect(localStorage.getItem(`oxygenquiz:draft:user-a:${SLOT}`)).toBeNull();
  });

  it("drops a draft older than the maximum age", () => {
    store(SLOT, "user-a", VERSION, Date.now() - MAX_DRAFT_AGE_MS - 1000, {
      title: "Ancient",
    });

    expect(
      readDraft<Payload>({
        slot: SLOT,
        userId: "user-a",
        version: VERSION,
        parse: parsePayload,
      }),
    ).toBeNull();
  });

  it("drops a draft stamped in the future, which a backwards clock jump would create", () => {
    store(SLOT, "user-a", VERSION, Date.now() + MAX_DRAFT_AGE_MS + 1000, {
      title: "From tomorrow",
    });

    expect(
      readDraft<Payload>({
        slot: SLOT,
        userId: "user-a",
        version: VERSION,
        parse: parsePayload,
      }),
    ).toBeNull();
  });

  it("drops anything the parser refuses", () => {
    store(SLOT, "user-a", VERSION, Date.now(), { title: 42 });

    expect(
      readDraft<Payload>({
        slot: SLOT,
        userId: "user-a",
        version: VERSION,
        parse: parsePayload,
      }),
    ).toBeNull();
    expect(localStorage.getItem(`oxygenquiz:draft:user-a:${SLOT}`)).toBeNull();
  });

  it("survives a value that isn't JSON at all", () => {
    localStorage.setItem(`oxygenquiz:draft:user-a:${SLOT}`, "not json {{");

    expect(() =>
      readDraft<Payload>({
        slot: SLOT,
        userId: "user-a",
        version: VERSION,
        parse: parsePayload,
      }),
    ).not.toThrow();
    expect(localStorage.getItem(`oxygenquiz:draft:user-a:${SLOT}`)).toBeNull();
  });

  it("does nothing at all without a signed-in user", () => {
    expect(
      writeDraft({
        slot: SLOT,
        userId: null,
        version: VERSION,
        serializedData: JSON.stringify({ title: "Nobody" }),
      }),
    ).toBeNull();
    expect(localStorage.length).toBe(0);

    expect(
      readDraft<Payload>({
        slot: SLOT,
        userId: undefined,
        version: VERSION,
        parse: parsePayload,
      }),
    ).toBeNull();
  });

  it("clears one slot and leaves the others alone", () => {
    writeDraft({
      slot: SLOT,
      userId: "user-a",
      version: VERSION,
      serializedData: JSON.stringify({ title: "Going" }),
    });
    writeDraft({
      slot: "other-slot",
      userId: "user-a",
      version: VERSION,
      serializedData: JSON.stringify({ title: "Staying" }),
    });

    clearDraft({ slot: SLOT, userId: "user-a" });

    expect(localStorage.getItem(`oxygenquiz:draft:user-a:${SLOT}`)).toBeNull();
    expect(
      localStorage.getItem("oxygenquiz:draft:user-a:other-slot"),
    ).not.toBeNull();
  });
});
