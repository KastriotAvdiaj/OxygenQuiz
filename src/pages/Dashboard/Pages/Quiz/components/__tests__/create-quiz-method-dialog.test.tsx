import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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

const props = {
  manualPath: "/my-dashboard/quizzes/create",
  aiTopicPath: "/my-dashboard/quizzes/create/ai/topic",
  aiMaterialPath: "/my-dashboard/quizzes/create/ai/material",
  aiFactsPath: "/my-dashboard/quizzes/create/ai/facts",
  associationsPath: "/my-dashboard/quizzes/create/associations",
};

describe("the create dialog follows the AI roles", () => {
  beforeEach(() => {
    roles = [];
  });

  it("sends a player straight to the builder — one way to build is no question", () => {
    // AI and fact quizzes are for staff and Teachers (ai-access.ts), Associations too.
    roles = ["User"];
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<CreateQuizMethodDialog {...props} />} />
          <Route path={props.manualPath} element={<p>The builder</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Create Quiz" }));
    expect(screen.getByText("The builder")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each(["Teacher", "Admin", "SuperAdmin"])("offers a %s AI", (role) => {
    roles = ["User", role];
    renderDialog();
    expect(screen.getByText("Manually")).toBeTruthy();
    expect(screen.getByText("With AI")).toBeTruthy();
  });
});
