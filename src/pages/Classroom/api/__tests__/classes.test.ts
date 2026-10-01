import { describe, expect, it } from "vitest";
import { parseStudents } from "../classes";

describe("parseStudents", () => {
  it("takes one name per line, trims, collapses spaces and drops blank lines", () => {
    expect(parseStudents("  Arta \n\n Blerim   K.\r\n   \nDea")).toEqual(["Arta", "Blerim K.", "Dea"]);
  });

  it("keeps duplicates — two Artas in one class happens", () => {
    expect(parseStudents("Arta\nArta")).toEqual(["Arta", "Arta"]);
  });

  it("is empty for an empty box", () => {
    expect(parseStudents("   \n ")).toEqual([]);
  });
});
