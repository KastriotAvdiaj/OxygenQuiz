import { Fragment, StrictMode } from "react";
import { beforeAll, describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import CreateQuestionForm from "../Multiple_Choice_Question/Create-Multiple-Choice-Question-Components/create-multiple-choice-question";

/**
 * A new multiple-choice question starts with four answer options — under StrictMode too, which
 * mounts every component twice in development. The options used to be appended by an Effect
 * ("if there are none, add two"), and StrictMode ran it twice, so development showed double
 * whatever the number was. They are the form's default values now.
 */
beforeAll(() => {
  // jsdom has no ResizeObserver; the drawer's layout measures with one.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("a new multiple-choice question", () => {
  // Both modes, because they disagreed: the old Effect gave 2 in production and 4 (2, twice) under
  // StrictMode — so a StrictMode-only test would have passed with the bug in place.
  it.each([
    ["production (no StrictMode)", Fragment],
    ["development (StrictMode)", StrictMode],
  ])("starts with four answer options in %s", async (_, Wrapper) => {
    render(
      <Wrapper>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <CreateQuestionForm languages={[]} categories={[]} difficulties={[]} onSuccess={() => {}} />
          </MemoryRouter>
        </QueryClientProvider>
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Multiple Choice" }));
    expect(await screen.findAllByPlaceholderText(/Answer Option/)).toHaveLength(4);
  });
});
