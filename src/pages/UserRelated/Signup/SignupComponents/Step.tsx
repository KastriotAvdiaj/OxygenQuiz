import React from "react";
import { Button } from "@/components/ui/button";
import { LiftedButton } from "@/common/LiftedButton";
import InputField from "@/common/InputField"; // Adjust the path based on your directory structure
import { ArrowLeft } from "lucide-react";

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

    <div className="flex justify-between items-center mt-8 gap-4">
      {!isFirstStep && onBack && (
        <Button
          type="button"
          variant="outline"
          className="w-1/3 h-11 text-base font-medium rounded-xl border-2 border-input hover:bg-accent/50 hover:text-accent-foreground transition-all duration-200"
          onClick={onBack}
        >
          <ArrowLeft/>
          Back
        </Button>
      )}
      
      <div className={isFirstStep ? "w-full" : "w-2/3 ml-auto"}>
        <LiftedButton
            type="button"
            className="text-base font-bold shadow-xl"
            outerClassName="w-full h-11"
            onClick={onNext}
            disabled={!value}
        >
            {isLastStep ? "Create Account" : "Continue"}
        </LiftedButton>
      </div>
    </div>
  </>
);

export default Step;
