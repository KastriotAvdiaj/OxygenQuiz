import { useState } from "react";
import "../global.css";
import { LoginForm } from "../../components/ui/LoginForm";
import { Button } from "@/components/ui/button";

export const Home = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  return (
    <>
      <div className="flex justify-center items-center h-screen gap-4">
        {isLoginOpen && <LoginForm />}
        <Button
          onClick={() => {
            setIsLoginOpen(!isLoginOpen);
          }}
        >
          Login
        </Button>
      </div>
    </>
  );
};
