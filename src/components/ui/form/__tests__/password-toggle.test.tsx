import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { Input } from "../input";

/**
 * Every password field has an eye button (PasswordToggle, wired into the shared Input). It
 * switches the field between hidden and shown, and it must never submit the form it sits in.
 */
describe("the password field's show/hide button", () => {
  it.each(["default", "minimal"] as const)("shows and hides the password (%s field)", (variant) => {
    render(<Input aria-label="Password" type="password" variant={variant} defaultValue="hunter22" />);
    const field = screen.getByLabelText("Password") as HTMLInputElement;
    expect(field.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(field.type).toBe("text");
    expect(field.value).toBe("hunter22");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field.type).toBe("password");
  });

  it("doesn't submit the form", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Input aria-label="Password" type="password" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("isn't added to other fields", () => {
    render(<Input aria-label="Email" type="email" />);
    expect(screen.queryByRole("button", { name: /password/i })).toBeNull();
  });
});
