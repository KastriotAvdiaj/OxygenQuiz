import React, { useState } from "react";
import InputField from "@/componentsOurs/InputField";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
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
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="flex flex-col space-y-2">
        <InputField
          label="Email"
          placeholder="Email"
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="flex flex-col space-y-2">
        <InputField
          label="Password"
          placeholder="Password"
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      <Button
        type="submit"
        variant={"addSave"}
        className="w-full py-3 text-white"
      >
        Log in
      </Button>
    </form>
  );
};

export default LoginForm;
