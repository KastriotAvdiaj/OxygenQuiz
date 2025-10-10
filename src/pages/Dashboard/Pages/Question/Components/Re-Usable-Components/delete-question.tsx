// src/components/questions/DeleteQuestion.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteQuestion } from "../../api/delete-question";
import { LiftedButton } from "@/common/LiftedButton";
import { Trash } from "lucide-react";
import { QuestionType } from "@/types/question-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; 
import { cn } from "@/utils/cn";

interface DeleteUserProps {
  id: number;
  questionType: QuestionType;
}

export interface IconButtonWithTooltipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  tooltip: string;
  variant?: "icon" | "default" | undefined;
  className?: string;
}

export const IconButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  IconButtonWithTooltipProps
>(({ icon, tooltip, variant = "icon", className, ...props }, ref) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <LiftedButton
            ref={ref}
            variant={variant}
            className={cn(className)}
            {...props}
          >
            {icon}
          </LiftedButton>
        </TooltipTrigger>
        <TooltipContent className="bg-background border-foreground/50">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

IconButtonWithTooltip.displayName = "IconButtonWithTooltip";

export const DeleteQuestion = ({ id, questionType }: DeleteUserProps) => {
  const { addNotification } = useNotifications();
  const deleteQuestionMutation = useDeleteQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Deleted",
        });
      },
    },
    questionType,
  });

  return (
    <ConfirmationDialog
      isDone={
        deleteQuestionMutation.isSuccess || deleteQuestionMutation.isError
      }
      icon="danger"
      title="Delete Question"
      body="Are you sure you want to delete this question?"
      triggerButton={<IconButtonWithTooltip
    icon={<Trash className="w-4 h-4" />}
    tooltip="Delete Question"
    variant="icon"
    className="rounded-xl bg-red-400"
  />}
      confirmButton={
        <Button
          isPending={deleteQuestionMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteQuestionMutation.mutate({ questionId: id });
          }}
        >
          Delete Question
        </Button>
      }
    />
  );
};