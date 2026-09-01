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
  /** Optional. Omit when driving the dialog via `isOpen`/`onOpenChange`. */
  triggerButton?: React.ReactElement;
  confirmButton: React.ReactElement;
  title: string;
  body?: string;
  cancelButtonText?: string;
  /**
   * Omit for no icon. It used to default to "danger", which quietly put a red alert on every
   * dialog that did not opt out — including ones asking something entirely routine, where a
   * warning icon overstates the stakes and trains people to ignore it where it matters. Every
   * caller passes this explicitly, so nothing depended on the default.
   */
  icon?: "danger" | "info";
  isDone?: boolean;
  /**
   * Controlled open state. When provided the dialog is fully controlled by the
   * parent — useful for rendering it OUTSIDE a dropdown/menu so those layers
   * can't unmount it mid-close (which strands `pointer-events: none` on <body>).
   */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ConfirmationDialog = ({
  triggerButton,
  confirmButton,
  title,
  body = "",
  cancelButtonText = "Cancel",
  icon,
  isDone = false,
  isOpen: controlledOpen,
  onOpenChange,
}: ConfirmationDialogProps) => {
  const { close: closeInternal, open: openInternal, isOpen: internalOpen } =
    useDisclosure();
  const cancelButtonRef = React.useRef(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (isControlled) onOpenChange?.(next);
      else if (next) openInternal();
      else closeInternal();
    },
    [isControlled, onOpenChange, openInternal, closeInternal]
  );

  useEffect(() => {
    if (isDone) setOpen(false);
  }, [isDone, setOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
    {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
    <DialogContent className="sm:max-w-[425px] bg-background text-foreground">
      <DialogHeader className="flex">
        <DialogTitle className="flex items-center gap-2">
          {icon === 'danger' && (
            <CircleAlert className="size-6 text-red-600" aria-hidden="true" />
          )}
          {icon === 'info' && (
            <Info className="size-6 text-blue-600" aria-hidden="true" />
          )}
          {title}
        </DialogTitle>
      </DialogHeader>

      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
        {body && (
          <div className="mt-2">
            <p>{body}</p>
          </div>
        )}
      </div>

      <DialogFooter>
        {confirmButton}
        <Button
          ref={cancelButtonRef}
          variant="outline"
          onClick={() => setOpen(false)}
        >
          {cancelButtonText}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};
