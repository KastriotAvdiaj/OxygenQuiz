import React from "react";
import { Divider } from "@/common/Divider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SignupProgressDisplayProps {
  step: number;
  username: string;
  email: string;
  setStep: (step: number) => void;
}

const SignupProgressDisplay: React.FC<SignupProgressDisplayProps> = ({
  step,
  username,
  email,
  setStep,
}) => (
  <TooltipProvider>
    <div className="mt-6 mb-6 space-y-2 ">
      {step > 1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className="text-lg text-foreground bg-muted p-1 cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => setStep(1)}
            >
              <strong className="text-foreground">Username:</strong> {username}
            </p>
          </TooltipTrigger>
          <TooltipContent className="bg-background">
            <p>Go back to username</p>
          </TooltipContent>
        </Tooltip>
      )}
      {step > 2 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className="text-lg text-foreground bg-muted p-1 cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => setStep(2)}
            >
              <strong className="text-foreground">Email:</strong> {email}
            </p>
          </TooltipTrigger>
          <TooltipContent className="bg-background">
            <p>Go back to email</p>
          </TooltipContent>
        </Tooltip>
      )}

      <Divider />
    </div>
  </TooltipProvider>
);

export default SignupProgressDisplay;
