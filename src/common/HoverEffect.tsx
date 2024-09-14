import React from "react";

type HoverEffectProps = {
  children: React.ReactNode;
  isActive?: boolean;
};

const HoverEffect: React.FC<HoverEffectProps> = ({
  children,
  isActive = false,
}) => {
  return (
    <span
      className={`relative after:content-[''] after:absolute after:left-1/2 after:bottom-0 after:w-full after:h-[2px] after:bg-[var(--text-hover)] after:transform after:origin-center after:-translate-x-1/2 after:scale-x-0 after:transition-transform after:duration-300 ${
        isActive ? "after:scale-x-100" : "hover:after:scale-x-100"
      }`}
    >
      {children}
    </span>
  );
};

export default HoverEffect;
