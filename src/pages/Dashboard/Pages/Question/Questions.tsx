import { Button } from "@/components/ui/button";
import { IoAdd } from "react-icons/io5";
import { FormDrawer } from "@/common/Form-Drawer";
import { NewQuestion } from "./Components/create-question";
import { useDisclosure } from "@/hooks/use-disclosure";

export const Questions = () => {
  const { isOpen, open, close, toggle } = useDisclosure();
  return (
    <div>
      <Button
        variant="addSave"
        onClick={open}
        aria-expanded={isOpen}
        className="w-fit text-white"
        aria-controls="new-question-form"
      >
        <IoAdd className="text-xl" /> New Question
      </Button>
      <FormDrawer
        className="w-fit"
        form={<NewQuestion />}
        isOpen={isOpen}
        toggle={toggle}
        onClose={close}
      />
    </div>
  );
};
