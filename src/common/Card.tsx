import React from "react";

interface CardProps {
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, children }) => {
  return (
    <div
      className={`relative drop-shadow-xl overflow-hidden rounded-xl ${className}`}
    >
      <div className="relative p-5 py-20 flex items-center flex-col justify-center gap-5 text-[var(--text)] z-[1] opacity-100 rounded-xl inset-0.5 bg-[var(--background-triary)]">
        {children}
      </div>
      <div className="absolute w-full h-full bg-white inset-0"></div>
    </div>
  );
};
