import { describe, expect, it } from "vitest";
import { avatarFileName, rotatedBoundingBox } from "../crop-avatar";

describe("rotatedBoundingBox", () => {
  it("keeps the size at 0° and 180°", () => {
    expect(rotatedBoundingBox(1200, 800, 0)).toEqual({ width: 1200, height: 800 });
    expect(rotatedBoundingBox(1200, 800, 180)).toEqual({ width: 1200, height: 800 });
  });

  it("swaps the sides at 90° and 270°", () => {
    // The rotate button turns in 90° steps; without the swap a portrait photo turned once is
    // drawn onto a landscape canvas and its top and bottom are cut off before cropping.
    expect(rotatedBoundingBox(1200, 800, 90)).toEqual({ width: 800, height: 1200 });
    expect(rotatedBoundingBox(1200, 800, 270)).toEqual({ width: 800, height: 1200 });
  });

  it("keeps turning past a full circle", () => {
    // The dialog adds 90 per press and never wraps, so 450° must behave like 90°.
    expect(rotatedBoundingBox(1200, 800, 450)).toEqual({ width: 800, height: 1200 });
  });

  it("grows the box at an angle in between", () => {
    expect(rotatedBoundingBox(100, 100, 45)).toEqual({ width: 141, height: 141 });
  });
});

describe("avatarFileName", () => {
  it("names the file after the bytes the browser actually produced", () => {
    // Safari can't encode WebP and toBlob falls back to PNG; the server checks the extension
    // against the decoded format, so asking for WebP must not mean naming it .webp.
    expect(avatarFileName("image/webp")).toBe("avatar.webp");
    expect(avatarFileName("image/png")).toBe("avatar.png");
    expect(avatarFileName("image/jpeg")).toBe("avatar.jpg");
  });
});
