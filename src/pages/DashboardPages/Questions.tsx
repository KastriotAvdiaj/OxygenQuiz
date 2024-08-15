import React from "react";
import { Button } from "@/components/ui/button";
import { IoAdd } from "react-icons/io5";
export const Questions = () => {
  return (
    <div>
      <Button variant="addSave">
        <IoAdd className="text-xl"/> New Question
      </Button>
    </div>
  );
};
