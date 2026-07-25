import React from "react";
import { Button } from "@/components/ui/button";
import { FaGoogle } from "react-icons/fa";
import { BsMicrosoft } from "react-icons/bs";

const SocialButtons: React.FC = () => (
  // Full-width on phones (bigger tap target), 75% from sm up
  <div className="flex flex-col w-full justify-center items-center mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
    <Button variant="outline" className="w-full sm:w-[75%] rounded h-9 text-sm sm:h-10 sm:text-base">
      <FaGoogle /> Continue with Google
    </Button>
    <Button variant="outline" className="w-full sm:w-[75%] rounded h-9 text-sm sm:h-10 sm:text-base">
      <BsMicrosoft /> Continue with Microsoft
    </Button>
  </div>
);

export default SocialButtons;
