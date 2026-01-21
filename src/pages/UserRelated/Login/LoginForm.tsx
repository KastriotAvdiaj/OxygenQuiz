import React, { useState } from "react";
import InputField from "@/common/InputField";
import { LiftedButton } from "@/common/LiftedButton";

/**
 *
 * @LoginForm
 *
 */

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  isPending: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, isPending }) => {
  const [formData, setFormData] = useState({
    email: "kaloti.avdiaj@gmail.com",
    password: "admin",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(formData.email, formData.password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      <div className="space-y-4">
        <InputField
          label="Email"
          placeholder="name@example.com"
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <div className="flex flex-col space-y-2">
          <InputField
            label="Password"
            placeholder="For Security reasons..."
            type="password"
            name="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <div className="flex justify-end">
             <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Forgot password?</a>
          </div>
        </div>
      </div>
      
      <div className="pt-2">
        <LiftedButton
          onClick={handleSubmit}
          isPending={isPending}
          className="text-base shadow-lg"
          outerClassName="w-full"
          disabled={isPending}
        >
          Sign In
        </LiftedButton>
      </div>
    </form>
  );
};

export default LoginForm;
