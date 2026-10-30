import { describe, expect, it } from "vitest";
import { Folder } from "lucide-react";

import { activeNavId } from "../active-nav-id";
import type { DashboardNavItem } from "@/pages/Dashboard/Components/dashboardNavConfig";

const items: DashboardNavItem[] = [
  { id: "quizzes", label: "Quizzes", icon: Folder, activeOn: ["quiz"] },
  { id: "questions", label: "Questions", icon: Folder },
];

describe("activeNavId", () => {
  it("lights a top-level page by its own segment", () => {
    expect(activeNavId("/dashboard/questions", "/dashboard", items)).toBe("questions");
  });

  it("keeps the section lit on a page below it", () => {
    expect(activeNavId("/dashboard/quizzes/create-quiz", "/dashboard", items)).toBe("quizzes");
  });

  it("maps a sibling route to the item that claims it", () => {
    // The bug: the last segment ("37") matched nothing, so no item was lit on the quiz page.
    expect(activeNavId("/dashboard/quiz/37", "/dashboard", items)).toBe("quizzes");
  });

  it("matches nothing at the dashboard root or outside it", () => {
    expect(activeNavId("/dashboard", "/dashboard", items)).toBe("");
    expect(activeNavId("/my-dashboard/quiz/37", "/dashboard", items)).toBe("");
  });
});
