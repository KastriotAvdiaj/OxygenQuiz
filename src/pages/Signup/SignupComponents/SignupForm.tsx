import React, { useState } from "react";
import SignupProgressDisplay from "./SignupProgressDisplay";
import Step from "./Step";

export const SignupForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

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
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = () => setStep((prev) => prev + 1);
  const handlePreviousStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleFinalSubmit = () => {
    console.log(formData);
    // Perform the final submission logic here
  };

  const handleNext = step === steps.length ? handleFinalSubmit : handleNextStep;

  return (
    <>
      <SignupProgressDisplay
        step={step}
        username={formData.username}
        email={formData.email}
        setStep={setStep}
      />
      <form
        className="space-y-4 text-lg"
        onSubmit={(e) => {
          e.preventDefault();
          handleFinalSubmit();
        }}
      >
        <Step
          {...steps[step - 1]}
          name={steps[step - 1].name}
          onNext={handleNext}
          onBack={step > 1 ? handlePreviousStep : undefined}
          onChange={handleChange}
          isLastStep={step === steps.length}
          isFirstStep={step === 1}
        />
      </form>
    </>
  );
};

export default SignupForm;
