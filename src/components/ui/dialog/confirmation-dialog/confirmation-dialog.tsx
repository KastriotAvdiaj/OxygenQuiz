import { CircleAlert, Info } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

import { useDisclosure } from "@/hooks/use-disclosure";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog";

export type ConfirmationDialogProps = {
  triggerButton: React.ReactElement;
  confirmButton: React.ReactElement;
  title: string;
  body?: string;
  cancelButtonText?: string;
  icon?: "danger" | "info";
  isDone?: boolean;
};

export const ConfirmationDialog = ({
  triggerButton,
  confirmButton,
  title,
  body = "",
  cancelButtonText = "Cancel",
  icon = "danger",
  isDone = false,
}: ConfirmationDialogProps) => {
  const { close, open, isOpen } = useDisclosure();
  const cancelButtonRef = React.useRef(null);

  useEffect(() => {
    if (isDone) {
      close();
    }
  }, [isDone, close]);

  useEffect(() => {
    console.log("Dialog open state:", isOpen);
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          console.log("Dialog closed via onOpenChange");
          close();
        } else {
          console.log("Dialog opened via onOpenChange");
          open();
        }
      }}
    >
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px]"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <DialogHeader className="flex">
          <DialogTitle className="flex items-center gap-2" id="dialog-title">
            {icon === "danger" && (
              <CircleAlert className="size-6 text-red-600" aria-hidden="true" />
            )}
            {icon === "info" && (
              <Info className="size-6 text-blue-600" aria-hidden="true" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        {body && (
          <div className="mt-2" id="dialog-description">
            <p>{body}</p>
          </div>
        )}

        <DialogFooter>
          {confirmButton}
          <Button
            ref={cancelButtonRef}
            variant="outline"
            onClick={() => {
              console.log("Cancel button clicked, closing dialog");
              close();
            }}
          >
            {cancelButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
