import React from "react";
import { Button } from "@/components/ui/button";
import InputField from "@/componentsOurs/InputField"; // Adjust the path based on your directory structure

interface StepProps {
  label: string;
  placeholder: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onBack?: () => void;
  isLastStep?: boolean;
  isFirstStep?: boolean;
  name: string;
}

const Step: React.FC<StepProps> = ({
  label,
  placeholder,
  type,
  value,
  onChange,
  onNext,
  onBack,
  isLastStep,
  isFirstStep,
  name,
}) => (
  <>
    <InputField
      label={label}
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={onChange}
      name={name}
    />

    <div className="flex justify-between mt-7">
      {onBack && (
        <Button
          type="button"
          variant="outline"
          className="w-[45%] py-5"
          onClick={onBack}
        >
          Back
        </Button>
      )}
      <Button
        type="button"
        variant="addSave"
        className={`text-white py-5 ${isFirstStep ? "w-[100%]" : "w-[45%]"}`}
        onClick={onNext}
        disabled={!value}
      >
        {isLastStep ? "Sign Up" : "Continue"}
      </Button>
    </div>
  </>
);

export default Step;
