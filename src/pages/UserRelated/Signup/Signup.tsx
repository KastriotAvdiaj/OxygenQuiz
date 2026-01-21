import React from "react";
import OxygenBackground from "/assets/oxygenquiz2.jpg";
import SignupForm from "./SignupComponents/SignupForm";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { O2Button } from "@/common/O2Button";
import { GoBackButton } from "@/common/Go-Back-Button";
    
const Signup: React.FC = () => {
    return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${OxygenBackground})` }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-0" />

      {/* Main Container */}
      <div className="w-full max-w-[90%] md:max-w-lg lg:max-w-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Navigation Header */}
        <div className="absolute -top-16 left-0 right-0 flex justify-between items-center px-2">
           <GoBackButton />
           <ModeToggle text={false} />
        </div>

        {/* Signup Card */}
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-8 md:p-12 flex flex-col items-center gap-6">
          
          {/* Logo & Branding */}
          <div className="flex flex-col items-center gap-2">
            <div className="transform hover:scale-105 transition-transform duration-300">
               <O2Button />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight text-center">
              Create an Account
            </h2>
          </div>

          <div className="w-full">
            <SignupForm />
            
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="text-primary font-semibold hover:underline hover:text-primary/90 transition-colors">
                  Login
                </a>
              </p>
            </div>
            
            <div className="w-full flex flex-col items-center gap-6 mt-6">
                <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-medium">
                        or
                    </span>
                </div>
                </div>
                <SocialButtons />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
