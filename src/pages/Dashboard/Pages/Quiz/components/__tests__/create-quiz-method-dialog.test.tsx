import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Who is signed in decides what the dialog offers (ai-access.ts).
let roles: string[] = [];
vi.mock("@/lib/Auth", () => ({ useUser: () => ({ data: { id: "u1", roles } }) }));
vi.mock("../../api/generate-ai-quiz", () => ({ useAiQuota: () => ({ data: undefined }) }));

import { CreateQuizMethodDialog } from "../create-quiz-method-dialog";

const renderDialog = () =>
  render(
    <MemoryRouter>
      <CreateQuizMethodDialog
        open
        initialStep="method"
        manualPath="/my-dashboard/quizzes/create"
        aiTopicPath="/my-dashboard/quizzes/create/ai/topic"
        aiMaterialPath="/my-dashboard/quizzes/create/ai/material"
        aiFactsPath="/my-dashboard/quizzes/create/ai/facts"
        associationsPath="/my-dashboard/quizzes/create/associations"
      />
    </MemoryRouter>,
  );

describe("the create dialog's AI card follows the AI roles", () => {
  beforeEach(() => {
    roles = [];
  });

  it("offers a player facts instead of AI", () => {
    roles = ["User"];
    renderDialog();
    expect(screen.getByText("Manually")).toBeTruthy();
    expect(screen.getByText("From a set of facts")).toBeTruthy();
    expect(screen.queryByText("With AI")).toBeNull();
  });

  it.each(["Teacher", "Admin", "SuperAdmin"])("offers a %s AI", (role) => {
    roles = ["User", role];
    renderDialog();
    expect(screen.getByText("With AI")).toBeTruthy();
    expect(screen.queryByText("From a set of facts")).toBeNull();
  });
});
