import React from "react";
import { Button } from "@/components/ui/button";
import { FaGoogle } from "react-icons/fa";
import { BsMicrosoft } from "react-icons/bs";

const SocialButtons: React.FC = () => (
  <div className="flex flex-col w-full justify-center items-center mt-6 space-y-3">
    <Button variant="outline" className="w-[75%] rounded">
      <FaGoogle /> Continue with Google
    </Button>
    <Button variant="outline" className="w-[75%] rounded">
      <BsMicrosoft /> Continue with Microsoft
    </Button>
  </div>
);

export default SocialButtons;
