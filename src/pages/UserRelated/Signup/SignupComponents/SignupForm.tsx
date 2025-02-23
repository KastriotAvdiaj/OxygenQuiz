import React, { useState } from "react";
import SignupProgressDisplay from "./SignupProgressDisplay";
import SignupSteps from "./SignupSteps";

export const SignupForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = () => setStep((prev) => prev + 1);
  const handlePreviousStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleFinalSubmit = () => {
    console.log(formData);
    // Perform the final submission logic here
  };

  const handleNext = step === 4 ? handleFinalSubmit : handleNextStep;

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
        <SignupSteps
          step={step}
          formData={formData}
          handleChange={handleChange}
          handleNext={handleNext}
          handlePreviousStep={handlePreviousStep}
        />
      </form>
    </>
  );
};

export default SignupForm;
