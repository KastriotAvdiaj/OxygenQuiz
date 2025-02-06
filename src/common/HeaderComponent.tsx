import React from "react";

interface HeaderComponentProps {
  children?: React.ReactNode;
  className?: string;
}

export const HeaderComponent: React.FC<HeaderComponentProps> = ({
  children,
  className,
}) => {
  return (
    <header
      className={`flex justify-between items-center bg-background ${className}`}
    >
      {children}
    </header>
  );
};
