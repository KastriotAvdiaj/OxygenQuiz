import { Button } from "@/components/ui/button";
import { useState } from "react";
import { IoAdd } from "react-icons/io5";
import { NewQuestion } from "@/pages/Dashboard/Pages/Question/Components/NewQuestion";

export const Questions = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen((prevState) => !prevState);
  };

  return (
    <div>
      {isOpen ? (
        <NewQuestion isOpen={isOpen} setIsOpen={setIsOpen} />
      ) : (
        <div>
          <Button
            variant="addSave"
            onClick={handleToggle}
            aria-expanded={isOpen}
            aria-controls="new-question-form"
          >
            <IoAdd className="text-xl" /> New Question
          </Button>
        </div>
      )}
    </div>
  );
};
