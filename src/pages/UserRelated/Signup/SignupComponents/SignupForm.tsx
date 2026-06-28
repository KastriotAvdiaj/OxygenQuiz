import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SignupProgressDisplay from "./SignupProgressDisplay";
import SignupSteps, { StepFeedback } from "./SignupSteps";
import Steps from "@/common/Steps";
import { Label } from "@/components/ui/form";
import { useRegister } from "@/lib/Auth";
import { useNotifications } from "@/common/Notifications";
import {
  useUsernameAvailability,
  useEmailAvailability,
  MIN_USERNAME_LENGTH,
} from "../api/check-availability";
import { useSignupConfig } from "../api/signup-config";

export const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: registerUser, isPending } = useRegister();

  // Drives whether an invite-code step is prepended. When required, every content step
  // shifts down by one (offset), so step numbering below is computed, not hard-coded.
  const { requireInviteCode } = useSignupConfig();
  const offset = requireInviteCode ? 1 : 0;
  const TOTAL_STEPS = 4 + offset;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });

  // Live, debounced uniqueness checks. These hooks self-gate, so they only hit the
  // API once the value is plausibly valid, and they never throw (see throwOnError).
  const usernameAvail = useUsernameAvailability(formData.username);
  const emailAvail = useEmailAvailability(formData.email);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Codes are case- and dash-insensitive server-side; uppercase as the user types for clarity.
    const value =
      e.target.name === "inviteCode"
        ? e.target.value.toUpperCase()
        : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handlePreviousStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const passwordValid = formData.password.length >= 12;
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.confirmPassword === formData.password;

  // Compute the feedback + gate for whichever step is showing.
  const getFeedback = (): StepFeedback => {
    // Invite-code step (only present when required) sits before the username step.
    if (requireInviteCode && step === 1) {
      const code = formData.inviteCode.trim();
      // Basic non-empty gate; the server validates that the code is real and unused on submit.
      return { nextDisabled: code.length === 0 };
    }

    // Map the visible step back to the original content-step numbering (1 = username, …).
    switch (step - offset) {
      case 1: {
        const name = formData.username.trim();
        if (name.length > 0 && name.length < MIN_USERNAME_LENGTH)
          return {
            error: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
            nextDisabled: true,
          };
        if (usernameAvail.isChecking)
          return { isChecking: true, nextDisabled: true };
        if (usernameAvail.isTaken)
          return { error: "This username is already taken", nextDisabled: true };
        if (usernameAvail.isAvailable)
          return { success: "Username is available", nextDisabled: false };
        // Couldn't reach the check — don't hard-block; the server still enforces
        // uniqueness on submit (409) and we bounce back here if it's taken.
        if (usernameAvail.isError) return { nextDisabled: false };
        return { nextDisabled: true };
      }
      case 2: {
        if (formData.email.length > 0 && !emailAvail.validFormat)
          return { error: "Enter a valid email address", nextDisabled: true };
        if (emailAvail.isChecking)
          return { isChecking: true, nextDisabled: true };
        if (emailAvail.isTaken)
          return {
            error: "This email is already registered",
            nextDisabled: true,
          };
        if (emailAvail.isAvailable)
          return { success: "Email is available", nextDisabled: false };
        if (emailAvail.isError) return { nextDisabled: false };
        return { nextDisabled: true };
      }
      case 3: {
        if (formData.password.length > 0 && !passwordValid)
          return {
            error: "Password must be at least 12 characters",
            nextDisabled: true,
          };
        return { nextDisabled: !passwordValid };
      }
      case 4: {
        if (formData.confirmPassword.length > 0 && !passwordsMatch)
          return { error: "Passwords do not match", nextDisabled: true };
        if (passwordsMatch)
          return { success: "Passwords match", nextDisabled: isPending };
        return { nextDisabled: true };
      }
      default:
        return { nextDisabled: true };
    }
  };

  const feedback = getFeedback();

  const handleFinalSubmit = () => {
    registerUser(
      {
        email: formData.email.trim(),
        username: formData.username.trim(),
        password: formData.password,
        // Only send a code when the gate is on; in open mode the field doesn't exist.
        ...(requireInviteCode
          ? { inviteCode: formData.inviteCode.trim() }
          : {}),
      },
      {
        onSuccess: () => {
          useNotifications.getState().addNotification({
            type: "success",
            title: "Welcome!",
            message: "Your account has been created.",
          });
          navigate("/");
        },
        onError: (error: any) => {
          const data = error?.response?.data;
          const message =
            data?.detail ||
            data?.title ||
            "We couldn't create your account. Please try again.";
          useNotifications.getState().addNotification({
            type: "error",
            title: "Sign up failed",
            message,
          });
          // If the server reports a duplicate (race between the live check and
          // submit) or a bad invite code, bounce the user back to the field that needs fixing.
          const lower = String(message).toLowerCase();
          if (lower.includes("invite") || lower.includes("code")) setStep(1);
          else if (lower.includes("email")) setStep(2 + offset);
          else if (lower.includes("username")) setStep(1 + offset);
        },
      }
    );
  };

  // Single guarded entry point shared by the Continue button and the Enter key.
  const advance = () => {
    if (feedback.nextDisabled) return;
    if (step === TOTAL_STEPS) handleFinalSubmit();
    else setStep((prev) => prev + 1);
  };

  return (
    <>
      <section className="flex flex-col justify-center gap-6 mb-8">
        <Label className="self-center text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          Step {step} of {TOTAL_STEPS}
        </Label>
        <Steps currentStep={step} totalSteps={TOTAL_STEPS} />
      </section>

      <SignupProgressDisplay
        step={step}
        username={formData.username}
        email={formData.email}
        setStep={setStep}
        offset={offset}
      />

      <form
        className="space-y-6 text-lg min-h-[250px] flex flex-col justify-center"
        onSubmit={(e) => {
          e.preventDefault();
          advance();
        }}
      >
        <SignupSteps
          step={step}
          formData={formData}
          requireInviteCode={requireInviteCode}
          handleChange={handleChange}
          handleNext={advance}
          handlePreviousStep={handlePreviousStep}
          feedback={feedback}
        />
      </form>
    </>
  );
};

export default SignupForm;
