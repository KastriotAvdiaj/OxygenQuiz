import React from "react";
import { MailPlus } from "lucide-react";
import OxygenBackground from "/assets/oxygenquiz2.jpg";
import SignupForm from "./SignupComponents/SignupForm";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { O2Button } from "@/common/O2Button";
import { GoBackButton } from "@/common/Go-Back-Button";

const Signup: React.FC = () => {
    return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background font-quiz">
      {/* Left Side - Background Image with Branding */}
      <div className="relative lg:w-1/2 h-[30vh] lg:h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${OxygenBackground})` }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center px-8 space-y-4">
          <div className="transform hover:scale-105 transition-transform duration-300 flex justify-center">
            <O2Button />
          </div>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-sm">
              <MailPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Invite only &middot; Public launch coming soon
            </span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Join Oxygen Quiz
          </h1>
          <p className="text-lg lg:text-xl text-white/90 max-w-md mx-auto">
            Create an account and start your learning adventure today
          </p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Navigation Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <GoBackButton />
          <ModeToggle text={false} />
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
            <p className="text-muted-foreground">
              Fill in your details to get started
            </p>
          </div>

          {/* Invite-only notice */}
          <div
            role="note"
            className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4"
          >
            <MailPlus
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="text-sm text-foreground/80">
              <span className="font-semibold text-foreground">
                Oxygen Quiz is invite only right now.
              </span>{" "}
              You'll need a valid invite code to create an account while we finish
              building. We'll be opening up to everyone soon.
            </p>
          </div>

          {/* Signup Form */}
          <SignupForm />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <SocialButtons />

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
  );
};

export default Signup;
