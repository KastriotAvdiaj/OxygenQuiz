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
  toggle: () => void;
  onClose: () => void;
  form: React.ReactNode;
  className?: string;
}

export const FormDrawer: React.FC<FormDrawerProps> = ({
  isOpen,
  toggle,
  onClose,
  form,
  className,
  ...props
}) => {
  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      {...props}
    >
      <DrawerContent
        className={className}
        aria-describedby="dialog-description"
      >
        <DrawerHeader>
          <DrawerTitle>Form</DrawerTitle>
          <Divider orientation="horizontal" thickness="1px" length="100%" />
        </DrawerHeader>

        {form}
        <DrawerFooter>
          <DrawerClose asChild>
            <button onClick={onClose}>Close</button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
