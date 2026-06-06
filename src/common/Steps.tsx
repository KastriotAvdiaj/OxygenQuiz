import React from "react";
import { Check } from "lucide-react";

interface StepsProps {
  /** The step the user is currently on (1-based). */
  currentStep: number;
  totalSteps?: number;
}

/**
 * Horizontal progress stepper with three distinct visual states:
 *  - completed  -> solid primary circle with a check icon
 *  - current    -> solid primary circle with a focus ring (shows the number)
 *  - upcoming   -> outlined muted circle (shows the number)
 * The connector between two dots fills with the primary color once the step
 * on its left is completed, so progress reads left-to-right.
 */
const Steps: React.FC<StepsProps> = ({ currentStep, totalSteps = 4 }) => {
  return (
    <div className="flex items-center w-full">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isLast = index === totalSteps - 1;

        return (
          <React.Fragment key={stepNumber}>
            <div
              className={[
                "flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold shrink-0 transition-all duration-300",
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isCurrent
                  ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-background border-muted-foreground/30 text-muted-foreground",
              ].join(" ")}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
            </div>

            {!isLast && (
              <div className="flex-1 h-0.5 mx-2 rounded-full bg-muted-foreground/20 overflow-hidden">
                <div
                  className={[
                    "h-full rounded-full bg-primary transition-all duration-300",
                    isCompleted ? "w-full" : "w-0",
                  ].join(" ")}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Steps;
