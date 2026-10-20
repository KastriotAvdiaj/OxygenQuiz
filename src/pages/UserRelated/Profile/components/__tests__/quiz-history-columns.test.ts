import { describe, expect, it } from "vitest";
import { formatSessionDuration } from "../quiz-history-columns";

// The API serialises `Duration` as a .NET TimeSpan through System.Text.Json: "[d.]hh:mm:ss[.fffffff]".
// A real session's EndTime - StartTime always carries the fraction, which the first parser read as
// the whole value — so every row of the history showed "—".
describe("formatSessionDuration", () => {
  it("reads a TimeSpan with fractional seconds, as the API actually sends it", () => {
    expect(formatSessionDuration("00:03:12.4567890")).toBe("3m 12s");
    expect(formatSessionDuration("00:00:41.0900000")).toBe("41s");
  });

  it("reads a whole-second TimeSpan", () => {
    expect(formatSessionDuration("00:03:12")).toBe("3m 12s");
  });

  it("shows hours, and folds days into them", () => {
    expect(formatSessionDuration("02:05:09.5")).toBe("2h 5m");
    expect(formatSessionDuration("1.02:05:09.1234567")).toBe("26h 5m");
  });

  it("is null for a session that never finished, or a value it cannot read", () => {
    expect(formatSessionDuration(null)).toBeNull();
    expect(formatSessionDuration("")).toBeNull();
    expect(formatSessionDuration("not a duration")).toBeNull();
  });
});
