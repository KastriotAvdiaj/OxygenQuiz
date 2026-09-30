import { expect, type Locator, type Page } from "@playwright/test";
import type { Credentials } from "../api";

/** /login — email and password. The social buttons are switched off in the E2E stack. */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly signInButton: Locator;
  readonly failure: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign In", exact: true });
    this.failure = page.getByText("Login failed. Please check your credentials.");
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  /**
   * Fills and submits the form. `fill` replaces the field, which matters under `npm run dev`:
   * LoginForm prefills the local admin's credentials in development builds.
   */
  async signIn({ email, password }: Pick<Credentials, "email" | "password">): Promise<void> {
    await expect(this.signInButton).toBeEnabled();
    await this.email.fill(email);
    await this.password.fill(password);
    await this.signInButton.click();
  }
}
