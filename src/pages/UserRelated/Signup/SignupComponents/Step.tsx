import React from "react";
import { Button } from "@/components/ui/button";
import { LiftedButton } from "@/common/LiftedButton";
import InputField from "@/common/InputField";
import { Error } from "@/components/ui/form/error";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

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
  /** Validation / availability feedback for this field. */
  error?: string;
  success?: string;
  isChecking?: boolean;
  /** Parent-controlled gate for the Continue/Create button. */
  nextDisabled?: boolean;
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
  error,
  success,
  isChecking,
  nextDisabled,
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

    {/* Feedback line: checking -> error -> success (only one shows at a time). */}
    <div className="min-h-[1.25rem] mt-1.5" aria-live="polite">
      {isChecking ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Checking availability…
        </p>
      ) : error ? (
        <Error errorMessage={error} />
      ) : success ? (
        <p className="flex items-center gap-1.5 text-sm text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {success}
        </p>
      ) : null}
    </div>

    <div className="flex justify-between items-center mt-6 gap-4">
      {!isFirstStep && onBack && (
        <Button
          type="button"
          variant="outline"
          className="w-1/3 h-11 text-base font-medium rounded-xl border-2 border-input hover:bg-accent/50 hover:text-accent-foreground transition-all duration-200"
          onClick={onBack}
        >
          <ArrowLeft />
          Back
        </Button>
      )}

      <div className={isFirstStep ? "w-full" : "w-2/3 ml-auto"}>
        <LiftedButton
          type="button"
          className="text-base font-bold shadow-xl"
          outerClassName="w-full h-11"
          onClick={onNext}
          disabled={nextDisabled}
        >
          {isLastStep ? "Create Account" : "Continue"}
        </LiftedButton>
      </div>
    </div>
  </>
);

export default Step;
