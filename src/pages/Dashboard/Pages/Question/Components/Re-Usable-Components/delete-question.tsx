// src/components/questions/DeleteQuestion.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteQuestion } from "../../api/delete-question";
import { LiftedButton } from "@/common/LiftedButton";
import { Trash } from "lucide-react";
import { AnyQuestion, QuestionType } from "@/types/question-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { Authorization } from "@/lib/authorization";

interface DeleteUserProps {
  questionType: QuestionType;
  question: AnyQuestion;
}

export interface IconButtonWithTooltipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  tooltip: string;
  variant?: "icon" | "default" | undefined;
  className?: string;
  buttonText?: string;
}

export const IconButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  IconButtonWithTooltipProps
>(
  (
    { icon, tooltip, variant = "icon", className, buttonText, ...props },
    ref
  ) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <LiftedButton
              ref={ref}
              variant={variant}
              className={cn(className)}
              {...props}>
              {buttonText}
              {icon}
            </LiftedButton>
          </TooltipTrigger>
          <TooltipContent className="bg-background border-foreground/50">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

IconButtonWithTooltip.displayName = "IconButtonWithTooltip";

export const DeleteQuestion = ({ questionType, question }: DeleteUserProps) => {
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
    <Authorization policyCheck="question:modify" resource={question}>
      <ConfirmationDialog
        isDone={
          deleteQuestionMutation.isSuccess || deleteQuestionMutation.isError
        }
        icon="danger"
        title="Delete Question"
        body="Are you sure you want to delete this question?"
        triggerButton={
          <IconButtonWithTooltip
            icon={<Trash className="w-4 h-4" />}
            tooltip="Delete Question"
            variant="icon"
            className="rounded-xl bg-red-400"
          />
        }
        confirmButton={
          <Button
            isPending={deleteQuestionMutation.isPending}
            type="button"
            variant="destructive"
            onClick={() => {
              deleteQuestionMutation.mutate({ questionId: question.id });
            }}>
            Delete Question
          </Button>
        }
      />
    </Authorization>
  );
};
