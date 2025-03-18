import * as React from "react";
import { useEffect } from "react";
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
  // body = "",
  isDone = false,
}: ChooseQuizDialogProps) => {
  const { close, open, isOpen } = useDisclosure();

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

      <DialogContent className="sm:max-w-[500px] sm:min-h-[200px] p-0 gap-0 overflow-hidden bg-background/30 backdrop-blur-lg border flex flex-col justify-center items-center gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center gap-3 z-10">
          {randomQuizButton}
          {chooseQuizButton}
        </div>
      </DialogContent>
    </Dialog>
  );
};
