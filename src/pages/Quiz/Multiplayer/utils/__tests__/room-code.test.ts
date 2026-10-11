import { describe, it, expect } from "vitest";
import { roomCodeFromPaste } from "../room-code";

describe("roomCodeFromPaste", () => {
  it("takes the code out of an invite link", () => {
    expect(roomCodeFromPaste("https://localhost:5173/multiplayer/join?code=8UZHRH")).toBe("8UZHRH");
    expect(roomCodeFromPaste("  https://oxygenquiz.com/multiplayer/join?code=8uzhrh&x=1 ")).toBe("8UZHRH");
  });

  it("takes the code out of a lobby link", () => {
    expect(roomCodeFromPaste("https://oxygenquiz.com/multiplayer/lobby/8UZHRH?settings=menu")).toBe("8UZHRH");
  });

  it("gives nothing for a link that carries no code", () => {
    expect(roomCodeFromPaste("https://oxygenquiz.com/choose-quiz")).toBe("");
  });

  it("strips what isn't part of a plain code", () => {
    expect(roomCodeFromPaste(' "8uz-hrh" ')).toBe("8UZHRH");
    expect(roomCodeFromPaste("8UZHRH123")).toBe("8UZHRH");
  });
});
