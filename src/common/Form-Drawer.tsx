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
      /**
       * We don't use the toggle function because the toggle function simply flips the current state
       * and onOpenChange is used to reflect the state of the drawer.
       */
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
