import React from "react";
import { MailPlus } from "lucide-react";
import OxygenBackground from "/assets/oxygenquiz2.jpg";
import SignupFlow from "./SignupComponents/SignupFlow";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { O2Button } from "@/common/O2Button";
import { GoBackButton } from "@/common/Go-Back-Button";

const Signup: React.FC = () => {
    return (
    // Standalone route (no HomeLayout) — provides its own scroll container;
    // see Login.tsx / docs/RESPONSIVE.md for the full rationale.
    <div className="app-shell-viewport w-full bg-background font-quiz">
      <div className="flex min-h-full w-full flex-col lg:flex-row">
      {/* Left Side - Background Image with Branding. SIDE-BY-SIDE ONLY (lg+).
          Below lg the parent is flex-col, so this panel does not sit beside the
          form — it stacks ON TOP of it as a band, pushing the form down and
          costing vertical space the form actually needs. Branding that has to
          shove the form off-screen to introduce it is not earning its place, so
          it is dropped entirely rather than shrunk: no hero, form owns the
          screen, no scrolling. It returns only where there is a second column to
          put it in (docs/RESPONSIVE.md). */}
      <div className="relative hidden lg:flex lg:w-1/2 lg:h-auto lg:self-stretch shrink-0 items-center justify-center overflow-hidden">
        {/* Background image — blurred so the branding reads cleanly over a busy photo.
            scale-110 is required, not decorative: a blur samples past the element's edge and
            would otherwise feather into transparency at the seams. The parent clips it. */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-[6px] scale-110"
          style={{ backgroundImage: `url(${OxygenBackground})` }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 space-y-2.5 sm:space-y-4">
          <div className="transform hover:scale-105 transition-transform duration-300 flex justify-center">
            <O2Button />
          </div>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-sm">
              <MailPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Invite only &middot; Public launch coming soon
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Join Oxygen Quiz
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-md mx-auto">
            Create an account and start your learning adventure today
          </p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      {/* px-6 on phones — see the matching note in Login.tsx. */}
      <div className="flex-1 lg:w-1/2 flex flex-col lg:justify-center px-6 py-4 sm:p-6 lg:p-12 relative">
        {/* Phone/tablet: controls in a static top row — the old absolute
            overlay sat on top of the "Create Account" heading. */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <GoBackButton />
          <ModeToggle text={false} />
        </div>
        {/* Desktop: floating controls (plenty of empty space up there) */}
        <div className="absolute top-6 right-6 hidden lg:flex items-center gap-3">
          <GoBackButton />
          <ModeToggle text={false} />
        </div>

        {/* Form Container — my-auto centers it in the space left after the
            control row; tighter rhythm on phones (docs/RESPONSIVE.md) */}
        <div className="w-full max-w-md space-y-5 sm:space-y-6 mx-auto my-auto">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-3xl font-bold text-foreground">Create Account</h2>
            {/* <p className="text-sm sm:text-base text-muted-foreground">
              Fill in your details to get started
            </p> */}
          </div>

          {/* The staged signup flow: invite gate first (while gated), then the choice of
              signing up manually or with Google/Microsoft. The invite-only note and the
              provider buttons live INSIDE the flow, on the stages where they belong —
              nothing signup-related renders before the gate. */}
          <SignupFlow />

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-primary font-semibold hover:underline hover:text-primary/90 transition-colors"
            >
              Login
            </a>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Signup;
