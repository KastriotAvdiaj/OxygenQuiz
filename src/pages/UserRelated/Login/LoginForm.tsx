import React, { useState } from "react";
import InputField from "@/common/InputField";
import { Button } from "@/components/ui";

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
    email: "",
    password: "",
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
        <Button
          onClick={handleSubmit}
          isPending={isPending}
          className="text-xl shadow-lg w-full p-6 text-white"
          disabled={isPending}
        >
          Sign In
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
