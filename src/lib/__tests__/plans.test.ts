import { describe, expect, test } from "vitest";
import { cheapestUpgrade, type PlanCatalog } from "../api/plans";
import { readPlanLimit } from "../Api-client";

// Mirrors PlanCatalog.cs as of 2026-10-10. The client never decides a limit — these tests are
// about which plan it *names*, which must agree with PlanCatalog.CheapestAbove on the server.
const catalog: PlanCatalog = {
  checkoutAvailable: false,
  clientToken: "",
  environment: "sandbox",
  countryCode: null,
  plans: [
    { tier: "Free", name: "Free", monthlyEur: 0, yearlyEur: 0, monthlyPriceId: null, yearlyPriceId: null,
      limits: { aiDailyGenerations: 2, maxOwnedQuizzes: null, maxLobbyPlayers: 10, maxClasses: 1 } },
    { tier: "Plus", name: "Plus", monthlyEur: 3.99, yearlyEur: 29, monthlyPriceId: null, yearlyPriceId: null,
      limits: { aiDailyGenerations: 10, maxOwnedQuizzes: null, maxLobbyPlayers: 20, maxClasses: 1 } },
    { tier: "Teacher", name: "Teacher", monthlyEur: 6.99, yearlyEur: 49, monthlyPriceId: null, yearlyPriceId: null,
      limits: { aiDailyGenerations: 15, maxOwnedQuizzes: null, maxLobbyPlayers: 40, maxClasses: null } },
  ],
};

describe("cheapestUpgrade", () => {
  test("names the next plan up for a limit the cheaper paid plan raises", () => {
    expect(cheapestUpgrade(catalog, "Free", (l) => l.aiDailyGenerations)?.tier).toBe("Plus");
    expect(cheapestUpgrade(catalog, "Plus", (l) => l.maxLobbyPlayers)?.tier).toBe("Teacher");
  });

  test("skips a plan that doesn't raise this limit", () => {
    // Plus keeps one class like Free, so the way out for classes is Teacher.
    expect(cheapestUpgrade(catalog, "Free", (l) => l.maxClasses)?.tier).toBe("Teacher");
  });

  test("offers nothing at the top, or when the limit is already unlimited", () => {
    expect(cheapestUpgrade(catalog, "Teacher", (l) => l.aiDailyGenerations)).toBeNull();
    expect(cheapestUpgrade(catalog, "Free", (l) => l.maxOwnedQuizzes)).toBeNull();
  });

  test("offers nothing before the catalogue has loaded", () => {
    expect(cheapestUpgrade(undefined, "Free", (l) => l.aiDailyGenerations)).toBeNull();
  });
});

describe("readPlanLimit", () => {
  const body = { title: "Your plan includes one class.", code: "PlanLimitReached", limit: "classes", max: 1, upgradeTo: "Teacher" };

  test("reads the PlanLimitReached 403 GlobalExceptionHandler writes", () => {
    expect(readPlanLimit(403, body)).toEqual({ limit: "classes", max: 1, upgradeTo: "Teacher" });
  });

  test("ignores an ordinary 403 and any other status", () => {
    expect(readPlanLimit(403, { title: "Only a SuperAdmin can do that." })).toBeNull();
    expect(readPlanLimit(400, body)).toBeNull();
    expect(readPlanLimit(403, "a bare string")).toBeNull();
  });

  test("a plan limit with no plan above it has no upgrade", () => {
    expect(readPlanLimit(403, { ...body, upgradeTo: null })?.upgradeTo).toBeNull();
  });
});
