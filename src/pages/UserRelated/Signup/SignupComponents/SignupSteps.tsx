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
  /**
   * Steps consumed before this form (1 when the invite gate ran as "Step 1", else 0).
   * Only affects numbering — the invite input itself lives in the gate, not here.
   */
  offset: number;
  formData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNext: () => void;
  handlePreviousStep: () => void;
  /** Whether a Back control makes sense here (first step may back out to the method choice). */
  canGoBack: boolean;
  /** Validation / availability feedback for the currently visible step. */
  feedback: StepFeedback;
}

const SignupSteps: React.FC<SignupStepsProps> = ({
  step,
  offset,
  formData,
  handleChange,
  handleNext,
  handlePreviousStep,
  canGoBack,
  feedback,
}) => {
  const steps = [
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

  const index = step - offset - 1; // 0-based content step

  return (
    <Step
      {...steps[index]}
      name={steps[index].name}
      onNext={handleNext}
      onBack={canGoBack ? handlePreviousStep : undefined}
      onChange={handleChange}
      isLastStep={index === steps.length - 1}
      isFirstStep={!canGoBack}
      error={feedback.error}
      success={feedback.success}
      isChecking={feedback.isChecking}
      nextDisabled={feedback.nextDisabled}
    />
  );
};

export default SignupSteps;
