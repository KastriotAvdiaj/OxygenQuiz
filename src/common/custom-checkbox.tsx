import React from "react";

type CustomCheckboxProps = {
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
}) => {
  return (
    <>
      <input
        type="checkbox"
        id="custom-checkbox"
        checked={checked}
        onChange={onChange}
        className="hidden peer"
      />
      <label
        htmlFor="custom-checkbox"
        className="relative flex items-center justify-center w-7 h-7 cursor-pointer rounded-md
          bg-background border border-border
          shadow-[0_4px_6px_rgba(0,0,0,0.1)]
          transition-all duration-200
          hover:shadow-[0_6px_8px_rgba(0,0,0,0.15)]
          active:shadow-[inset_0_3px_0_rgba(0,0,0,0.2)]
          peer-checked:bg-primary peer-checked:border-transparent
          peer-checked:shadow-[inset_0_2px_0_rgba(0,0,0,0.15)]"
      >
        {checked && (
          <svg
            className="w-6 h-6 text-primary-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <polyline
              points="20 6 9 17 4 12"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </label>
    </>
  );
};
