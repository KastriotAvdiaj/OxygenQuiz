import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, User, Mail } from "lucide-react";

interface SignupProgressDisplayProps {
  step: number;
  username: string;
  email: string;
  setStep: (step: number) => void;
  /** Number of steps before the username step (1 when an invite-code step is prepended). */
  offset?: number;
}

const SignupProgressDisplay: React.FC<SignupProgressDisplayProps> = ({
  step,
  username,
  email,
  setStep,
  offset = 0,
}) => {
  const usernameStep = 1 + offset;
  const emailStep = 2 + offset;

  // Nothing to summarise until the user is past the username step.
  if (step <= usernameStep) return null;

  return (
    <div className="flex flex-wrap gap-2 animate-in slide-in-from-left-2 duration-300">
      {step > usernameStep && (
        <Badge
          variant="secondary"
          className="px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
          onClick={() => setStep(usernameStep)}
        >
          <User className="w-3 h-3" />
          <span className="font-medium">{username}</span>
          <Check className="w-3 h-3 ml-1 text-green-500" />
        </Badge>
      )}
      {step > emailStep && (
        <Badge
          variant="secondary"
          className="px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
          onClick={() => setStep(emailStep)}
        >
          <Mail className="w-3 h-3" />
          <span className="font-medium">{email}</span>
          <Check className="w-3 h-3 ml-1 text-green-500" />
        </Badge>
      )}
    </div>
  );
};

export default SignupProgressDisplay;
