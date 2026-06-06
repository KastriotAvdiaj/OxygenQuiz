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
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNext: () => void;
  handlePreviousStep: () => void;
  /** Validation / availability feedback for the currently visible step. */
  feedback: StepFeedback;
}

const SignupSteps: React.FC<SignupStepsProps> = ({
  step,
  formData,
  handleChange,
  handleNext,
  handlePreviousStep,
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
