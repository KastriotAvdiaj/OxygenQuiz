// src/components/questions/DeleteQuestion.tsx
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteQuestion } from "../../api/delete-question";
import { Trash, Trash2 } from "lucide-react";
import { AnyQuestion, QuestionType } from "@/types/question-types";
import { Authorization } from "@/lib/authorization";
import { IconButtonWithTooltip } from "./icon-button-with-tooltip";
import { LiftedButton } from "@/common/LiftedButton";

interface DeleteUserProps {
  questionType: QuestionType;
  question: AnyQuestion;
}

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
    <Authorization policyCheck="question:delete" resource={question}>
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
            liftColor="#f87171" // red-400 — depth layers match the face
          />
        }
        confirmButton={
          <LiftedButton
            isPending={deleteQuestionMutation.isPending}
            type="button"
            className="flex w-full items-center justify-center gap-2 whitespace-nowrap bg-red-600 text-white sm:w-auto py-1 text-sm"
            liftColor="red-700"
            onClick={() => {
              deleteQuestionMutation.mutate({ questionId: question.id });
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </LiftedButton>
        }
      />
    </Authorization>
  );
};
