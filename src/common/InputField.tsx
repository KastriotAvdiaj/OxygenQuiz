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
    <Label htmlFor={id} className="text-lg">
      {label}
    </Label>
    <Input
      id={id}
      name={name}
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={onChange}
      className="rounded text-foreground py-5 bg-muted border border-border"
      {...props}
    />
  </div>
);

export default InputField;
