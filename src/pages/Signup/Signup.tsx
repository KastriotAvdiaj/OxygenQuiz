import React from "react";
import SignupForm from "./SignupComponents/SignupForm";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";

const Signup: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col">
      <div className="relative flex justify-center pt-10">
        <ModeToggle className="absolute top-4 right-4" text={true} />
        <h1 className="text-7xl font-bold text-[var(--text-hover)]">O₂</h1>
      </div>
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-[var(--background-secondary)] p-8 rounded shadow-md w-[50%] max-w-lg flex-grow flex flex-col items-center justify-center">
          <div className="w-[70%]">
            <h2 className="text-3xl font-semibold mb-6 text-center">
              Create an Account
            </h2>
            <SignupForm />
            <div className="text-center mt-4">
              <p className="text-sm">
                Already have an account?{" "}
                <a href="/login" className="text-[var(--text-hover)] underline">
                  Login
                </a>
              </p>
            </div>
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[var(--background-secondary)] px-2">
                  OR
                </span>
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
