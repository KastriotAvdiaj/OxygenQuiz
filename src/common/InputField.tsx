import React, { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/form";
import { Label } from "@/components/ui/form/label";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  placeholder: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  type,
  value,
  onChange,
  id,
  name,
  ...props
}) => (
  <div className="grid w-full gap-1.5">
    <Label htmlFor={id} className="text-sm sm:text-lg">
      {label}
    </Label>
    {/* Compact on phones; text stays ≥16px so iOS doesn't zoom on focus
        (docs/RESPONSIVE.md). Only used by the login/signup forms. */}
    <Input
      id={id}
      name={name}
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={onChange}
      variant="minimal"
      className="rounded shadow-md text-foreground bg-background py-2.5 sm:py-4 md:py-5 text-base md:text-lg h-auto max-h-none"
      {...props}
    />
  </div>
);

export default InputField;
