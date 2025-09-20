import React, { forwardRef } from "react";

interface HeaderComponentProps {
  children?: React.ReactNode;
  className?: string;
}

export const HeaderComponent = forwardRef<HTMLElement, HeaderComponentProps>(
  ({ children, className }, ref) => {
    return (
      <header
        ref={ref}
        className={`flex justify-between items-center ${className}`}
      >
        {children}
      </header>
    );
  }
);

HeaderComponent.displayName = "HeaderComponent";
