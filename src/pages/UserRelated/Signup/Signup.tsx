import React from "react";
import SignupForm from "./SignupComponents/SignupForm";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { O2Button } from "@/common/O2Button";
import { GoBackButton } from "@/common/Go-Back-Button";

const Signup: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground">
      <div className="relative flex justify-center pt-10">
        <div className="absolute top-4 flex justify-between gap-5 w-full px-5">
          <GoBackButton />
          <ModeToggle text={true} />
        </div>
        <O2Button />
      </div>
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-muted p-8 rounded shadow-md w-[50%] max-w-lg flex-grow flex flex-col items-center justify-center">
          <div className="w-[70%]">
            <h2 className="text-3xl font-semibold mb-6 text-center">
              Create an Account
            </h2>
            <SignupForm />
            <div className="text-center mt-4">
              <p className="text-sm">
                Already have an account?{" "}
                <a href="/login" className="text-foreground underline">
                  Login
                </a>
              </p>
            </div>
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-muted px-2">OR</span>
              </div>
            </div>
            <SocialButtons />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
