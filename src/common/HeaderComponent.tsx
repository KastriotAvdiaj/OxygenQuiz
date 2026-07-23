import React, { forwardRef } from "react";

interface HeaderComponentProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  className?: string;
}

export const HeaderComponent = forwardRef<HTMLElement, HeaderComponentProps>(
  ({ children, className, ...rest }, ref) => {
    return (
      <header
        ref={ref}
        className={`flex justify-between items-center ${className}`}
        {...rest}
      >
        {children}
      </header>
    );
  }
);

HeaderComponent.displayName = "HeaderComponent";
