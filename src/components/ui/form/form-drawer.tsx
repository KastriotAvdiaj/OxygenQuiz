import * as React from "react";
import { useDisclosure } from "@/hooks/use-disclosure";
import { cn } from "@/utils/cn";
import { Button } from "../button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
  DrawerTitle,
} from "../drawer";

type FormDrawerProps = {
  isDone: boolean;
  triggerButton: React.ReactElement;
  submitButton: React.ReactElement;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export const FormDrawer = ({
  title,
  children,
  isDone,
  triggerButton,
  submitButton,
  className,
}: FormDrawerProps) => {
  const { close, open, isOpen } = useDisclosure();

  React.useEffect(() => {
    if (isDone) {
      close();
    }
  }, [isDone, close]);

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        } else {
          open();
        }
      }}
    >
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent
        className={cn(
          "overflow-y-auto flex max-w-[800px] flex-col justify-between sm:max-w-[540px]",
          className
        )}
      >
        <div className="flex flex-col">
          <DrawerHeader className="px-3 py-2 border-b border-gray-500">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div>{children}</div>
        </div>
        <DrawerFooter className="gap-4">
          {submitButton}
          <DrawerClose asChild>
            <Button variant="outline" type="button">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
