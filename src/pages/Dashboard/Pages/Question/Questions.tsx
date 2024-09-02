import { Button } from "@/components/ui/button";
import { useState } from "react";
import { IoAdd } from "react-icons/io5";
import { FormDrawer } from "@/common/Form-Drawer";
import { NewQuestion } from "./Components/NewQuestion";

export const Questions = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleDrawer = () => {
    setIsDrawerOpen((prevState) => !prevState);
  };

  return (
    <div>
      <Button
        variant="addSave"
        onClick={handleDrawer}
        aria-expanded={isDrawerOpen}
        className="w-fit"
        aria-controls="new-question-form"
      >
        <IoAdd className="text-xl " /> New Question
      </Button>
      <FormDrawer
        className="w-fit"
        form={<NewQuestion />}
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
      />
    </div>
  );
};
