import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { FaGoogle } from "react-icons/fa";
import { BsMicrosoft } from "react-icons/bs";

export const Signup = () => {
  return (
    <div className="h-screen w-full flex flex-col">
      <ModeToggle className="absolute top-4 right-4" text={true} />

      {/* Logo Section */}
      <div className="flex justify-center pt-10">
        <h1 className="text-7xl font-bold text-[var(--text-hover)]">O₂</h1>
      </div>

      {/* Signup Form Section */}
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-[var(--background-secondary)] p-8 rounded shadow-md w-[50%] max-w-lg flex-grow flex items-center justify-center">
          <div className="w-[70%]">
            <h2 className="text-3xl font-semibold mb-6 text-center">
              Create an Account
            </h2>
            <form className="space-y-4 text-lg">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="email" className="text-lg">
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Email"
                  className="rounded py-5"
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="username" className="text-lg">
                  Username
                </Label>
                <Input
                  type="text"
                  id="username"
                  placeholder="Username"
                  className="rounded py-5"
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="password" className="text-lg">
                  Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  placeholder="Password"
                  className="rounded py-5"
                />
              </div>
              <div className="flex items-center justify-center">
                <Button
                  type="submit"
                  variant={"addSave"}
                  className="w-1/2 text-white py-5 mt-7"
                >
                  Sign Up
                </Button>
              </div>
            </form>

            {/* Already have an account */}
            <div className="text-center mt-4">
              <p className="text-sm">
                Already have an account?{" "}
                <a href="/login" className="text-[var(--text-hover)] underline">
                  Login
                </a>
              </p>
            </div>

            {/* Divider */}
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[var(--background-secondary)] px-2">
                  OR
                </span>
              </div>
            </div>

            {/* Login with Google/Microsoft */}
            <div className="flex flex-col w-full justify-center items-center mt-6 space-y-3">
              <Button variant="outline" className="w-[75%] rounded">
                <FaGoogle /> Continue with Google
              </Button>
              <Button variant="outline" className="w-[75%] rounded">
                <BsMicrosoft /> Continue with Microsoft
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
