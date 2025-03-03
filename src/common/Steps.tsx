import { Separator } from "@/components/ui/separator";
import React from "react";

interface StepsProps {
  currentStep: number;
  totalSteps?: number;
  separatorColor?: string;
}

const Steps: React.FC<StepsProps> = ({
  currentStep,
  totalSteps = 3,
  separatorColor,
}) => {
  return (
    <div className="flex items-center space-x-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep >= stepNumber;
        return (
          <React.Fragment key={stepNumber}>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full 
                
                ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : `${
                        separatorColor ? `bg-${separatorColor}` : ""
                      } text-muted-foreground`
                }`}
            >
              {stepNumber}
            </div>
            {index < totalSteps - 1 && (
              <Separator
                className={`flex-1 ${
                  separatorColor ? `bg-${separatorColor}` : ""
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Steps;
