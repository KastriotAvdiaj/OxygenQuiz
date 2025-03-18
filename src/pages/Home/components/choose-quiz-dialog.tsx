import * as React from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ChooseQuizDialogProps = {
  triggerButton: React.ReactElement;
  randomQuizButton: React.ReactElement;
  chooseQuizButton: React.ReactElement;
  title: string;
  body?: string;
  cancelButtonText?: string;
  icon?: "danger" | "info";
  isDone?: boolean;
};

export const ChooseQuizDialog = ({
  triggerButton,
  randomQuizButton,
  chooseQuizButton,
  title,
  body = "",
  cancelButtonText = "Cancel",
  isDone = false,
}: ChooseQuizDialogProps) => {
  const { close, open, isOpen } = useDisclosure();
  const cancelButtonRef = React.useRef(null);

  useEffect(() => {
    if (isDone) {
      close();
    }
  }, [isDone, close]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        } else {
          open();
        }
      }}
    >
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-muted-foreground">
        <div className="flex flex-col">
          <DialogHeader className="p-4">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl font-semibold">
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Body text if provided */}
          {body && (
            <div className="px-6 py-2 text-muted-foreground">
              <p>{body}</p>
            </div>
          )}

          <div className="flex justify-center gap-3 py-4">
            <div className="col-span-1">{randomQuizButton}</div>
            <div className="col-span-1">{chooseQuizButton}</div>
          </div>

          {/* Cancel button */}
          <div className="p-4 bg-muted/30 flex justify-center border-t">
            <Button
              ref={cancelButtonRef}
              variant="ghost"
              onClick={close}
              className="text-muted-foreground hover:text-foreground"
            >
              {cancelButtonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
