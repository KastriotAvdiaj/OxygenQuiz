import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Divider } from "./Divider";

interface FormDrawerProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  form: React.ReactNode;
  className?: string;
}

export const FormDrawer: React.FC<FormDrawerProps> = ({
  isOpen,
  setIsOpen,
  form,
  className,
  ...props
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} {...props}>
      <DrawerContent className={className}>
        <DrawerHeader>
          <DrawerTitle>Form</DrawerTitle>
          <Divider orientation="horizontal" thickness="1px" length="100%" />
        </DrawerHeader>
        {form}
        <DrawerFooter>
          <DrawerClose asChild>
            <button onClick={() => setIsOpen(false)}>Close</button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
