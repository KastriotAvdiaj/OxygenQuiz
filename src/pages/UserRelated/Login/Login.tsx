import React from "react";
import { useNavigate } from "react-router-dom";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import LoginForm from "./LoginForm";
import { useLogin } from "@/lib/Auth";
import { GoBackButton } from "@/common/Go-Back-Button";
import { useSearchParams } from "react-router-dom";
import { O2Button } from "@/common/O2Button";
import { useNotifications } from "@/common/Notifications";
// import Squares from "@/common/Effect-Related/background-squares";
// import { useTheme } from "@/components/ui";
// import OxygenBackground from "../../../assets/oxygenquiz.jpeg";
import OxygenBackground from "../../../assets/oxygenquiz2.jpg";

/**
 *
 * @LoginPage
 *
 */

const Login: React.FC = () => {
  // const { theme } = useTheme();
  // const colors = {
  //   borderColor: theme === "dark" ? "#626262" : "#b4b4b4",
  //   hoverFillColor: theme === "dark" ? "#ffffff" : "#000000",
  // };

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutate: login, isPending, isError } = useLogin();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(
        { email, password },
        {
          onSuccess: () => {
            useNotifications.getState().addNotification({
              type: "success",
              title: "Success",
              message: "Logged in successfully!",
            });
            const redirectTo = searchParams.get("redirectTo");
            if (redirectTo) {
              navigate(redirectTo, { replace: true });
            } else {
              navigate(-1);
            }
          },
          onError: (error: unknown) => {
            console.error("Login failed:", error);
            useNotifications.getState().addNotification({
              type: "error",
              title: "Error",
              message: "Login failed. Please try again.",
            });
          },
        }
      );
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${OxygenBackground})` }}
      />

      {/* Gray Overlay */}
      <div className="absolute inset-0 backdrop-blur-sm" /> 

      {/* Content Container */}
      <div className="relative h-full w-full flex flex-col bg-transparent">
        <div className="relative flex justify-center pt-10">
          <div className="absolute top-4 flex justify-between gap-5 w-full px-5">
            <GoBackButton />
            <ModeToggle text={true} />
          </div>
          <O2Button />
        </div>

        <div className="flex-grow flex items-center justify-center z-20">
          <div className=" backdrop-blur-md text-foreground p-8 rounded shadow-xl max-w-lg flex-grow flex flex-col items-center justify-center">
            <div className="w-[70%]">
              <h2 className="text-3xl text-white font-semibold mb-6 text-center">
                Welcome Back
              </h2>
              {isError && (
                <p className="text-red-500 font-semibold py-2">
                  Login failed. Please try again.
                </p>
              )}
              <LoginForm onLogin={handleLogin} isPending={isPending} />
              <div className="text-center mt-4">
                <p className="text-sm">
                  Don't have an account?{" "}
                  <a href="/signup" className="text-foreground underline">
                    Sign up
                  </a>
                </p>
              </div>
              <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-muted px-2">OR</span>
                </div>
              </div>
              <SocialButtons />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
