import React from "react";
import Step from "./Step";

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
}

const SignupSteps: React.FC<SignupStepsProps> = ({
  step,
  formData,
  handleChange,
  handleNext,
  handlePreviousStep,
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
    />
  );
};

export default SignupSteps;
