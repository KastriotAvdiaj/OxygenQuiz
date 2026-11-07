import { describe, it, expect } from "vitest";

import { signupErrorMessage } from "../api/signup-error-message";

const failed = (data: unknown) => ({ response: { status: 400, data } });

describe("signupErrorMessage", () => {
  it("shows the field's own sentence from a validation failure, not the generic title", () => {
    // What the API answers for a password on the common-password blocklist.
    const error = failed({
      title: "One or more validation errors occurred.",
      status: 400,
      errors: { Password: ["This password is too common or predictable. Please choose a stronger one."] },
    });
    expect(signupErrorMessage(error)).toBe(
      "This password is too common or predictable. Please choose a stronger one.",
    );
  });

  it("shows a service rule's detail", () => {
    expect(signupErrorMessage(failed({ title: "Conflict", detail: "Username is already taken." }))).toBe(
      "Username is already taken.",
    );
  });

  it("falls back to a plain sentence when there is nothing to show", () => {
    expect(signupErrorMessage(new Error("Network Error"))).toBe(
      "We couldn't create your account. Please try again.",
    );
  });
});
