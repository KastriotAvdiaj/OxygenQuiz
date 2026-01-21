import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, User, Mail } from "lucide-react";

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
}) => {
  if (step === 1) return null;

  return (
    <div className="flex flex-wrap gap-2 animate-in slide-in-from-left-2 duration-300">
      {step > 1 && (
        <Badge
          variant="secondary"
          className="px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
          onClick={() => setStep(1)}
        >
          <User className="w-3 h-3" />
          <span className="font-medium">{username}</span>
          <Check className="w-3 h-3 ml-1 text-green-500" />
        </Badge>
      )}
      {step > 2 && (
        <Badge
          variant="secondary"
          className="px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
          onClick={() => setStep(2)}
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
