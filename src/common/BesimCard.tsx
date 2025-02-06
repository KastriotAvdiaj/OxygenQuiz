import React from "react";
import BesimDina from "../assets/BesimDina.png";
import { cn } from "@/utils/cn";

interface BesimCardProps {
  className?: string;
}

export const BesimCard: React.FC<BesimCardProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "relative w-[500px] h-[600px] flex items-center justify-center z-10 border-4 border-transparent bg-gradient-to-r from-foreground via-[var(--muted)] to-foreground p-[2px] rounded-xl transition-transform transform hover:rotate-3 hover:scale-105 hover:shadow-2xl",
        className
      )}
    >
      <div className="w-full h-full bg-foreground rounded-xl shadow-lg transition-none">
        <img
          src={BesimDina}
          alt="Besim Dina"
          className="w-full h-full object-cover absolute right-[-158px] translate-x-[30px] z-12 pointer-events-none"
        />
      </div>
    </div>
  );
};
