import React from "react";
import { Button } from "@/components/ui/button";
import { LiftedButton } from "@/common/LiftedButton";
import InputField from "@/common/InputField";
import { Error } from "@/components/ui/form/error";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

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
  /**
   * When given, the button stays **clickable** while `nextDisabled` and calls this instead of
   * `onNext` — for steps that would rather say what's wrong than present a dead button (the
   * invite gate). Steps that don't pass it keep the plain disabled button.
   */
  onNextBlocked?: () => void;
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
  onNextBlocked,
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
    <div className="min-h-[1.25rem]" aria-live="polite">
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

    {/* Tight under the field: the feedback line above already reserves its own row, and mt-6
          on top of that left the button floating away from the input it belongs to. */}
      <div className="flex justify-between items-center mt-1 gap-4 sm:mt-2">
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

      {/* First step has no Back button beside it, so the action doesn't need the full width —
          a compact button on the right reads as "next", not as the page's main event. */}
      <div className={isFirstStep ? "ml-auto w-auto" : "w-2/3 ml-auto"}>
        <LiftedButton
          type="button"
          className="px-8 text-base font-bold shadow-xl"
          outerClassName="w-full h-11"
          onClick={nextDisabled && onNextBlocked ? onNextBlocked : onNext}
          disabled={nextDisabled && !onNextBlocked}
        >
          {isLastStep ? (
            "Create Account"
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </LiftedButton>
      </div>
    </div>
  </>
);

export default Step;
