import React from "react";
import Step from "./Step";

export interface StepFeedback {
  error?: string;
  success?: string;
  isChecking?: boolean;
  nextDisabled?: boolean;
}

interface SignupStepsProps {
  step: number;
  formData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    inviteCode: string;
  };
  /** When true, an invite-code step is prepended as the first step. */
  requireInviteCode: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNext: () => void;
  handlePreviousStep: () => void;
  /** Validation / availability feedback for the currently visible step. */
  feedback: StepFeedback;
}

const SignupSteps: React.FC<SignupStepsProps> = ({
  step,
  formData,
  requireInviteCode,
  handleChange,
  handleNext,
  handlePreviousStep,
  feedback,
}) => {
  const inviteStep = {
    label: "Invite code",
    name: "inviteCode",
    type: "text",
    placeholder: "e.g. K7QM-3FXP-9T",
    value: formData.inviteCode,
  };

  const steps = [
    ...(requireInviteCode ? [inviteStep] : []),
    {
      label: "Username",
      name: "username",
      type: "text",
      placeholder: "Username",
      value: formData.username,
    },
    {
      label: "Email",
      name: "email",
      type: "email",
      placeholder: "Email",
      value: formData.email,
    },
    {
      label: "Password",
      name: "password",
      type: "password",
      placeholder: "Password",
      value: formData.password,
    },
    {
      label: "Confirm Password",
      name: "confirmPassword",
      type: "password",
      placeholder: "Confirm Password",
      value: formData.confirmPassword,
    },
  ];

  return (
    <Step
      {...steps[step - 1]}
      name={steps[step - 1].name}
      onNext={handleNext}
      onBack={step > 1 ? handlePreviousStep : undefined}
      onChange={handleChange}
      isLastStep={step === steps.length}
      isFirstStep={step === 1}
      error={feedback.error}
      success={feedback.success}
      isChecking={feedback.isChecking}
      nextDisabled={feedback.nextDisabled}
    />
  );
};

export default SignupSteps;
