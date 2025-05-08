import { useNotifications } from "@/common/Notifications";
import { useCreateQuestionCategory } from "../api/create-question-categories";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Smile } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { createQuestionCategoryInputSchema } from "../api/create-question-categories";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { useDisclosure } from "@/hooks/use-disclosure";
import { LiftedButton } from "@/common/LiftedButton";

export const CreateQuestionCategoryForm = () => {
  const { addNotification } = useNotifications();
  const createQuestionCategoryMutation = useCreateQuestionCategory({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Category Created",
        });
      },
      onError: () => {
        addNotification({
          type: "error",
          title: "Error Creating Question Category",
        });
      },
    },
  });

  const { isOpen, open, close } = useDisclosure(false);

  return (
    <>
      <FormDrawer
        isDone={createQuestionCategoryMutation.isSuccess}
        triggerButton={
          <LiftedButton className="text-xs">+ New Category</LiftedButton>
        }
        title="Create New Question Category"
        submitButton={
          <Button
            form="create-question-cateogry"
            variant="addSave"
            className="rounded-sm text-white"
            type="submit"
            size="default"
            isPending={createQuestionCategoryMutation.isPending}
            disabled={createQuestionCategoryMutation.isPending}
          >
            Submit
          </Button>
        }
      >
        <Form
          id="create-question-cateogry"
          onSubmit={(values) => {
            createQuestionCategoryMutation.mutate({ data: values });
          }}
          schema={createQuestionCategoryInputSchema}
        >
          {({ register, formState, watch, setValue }) => {
            const selectedEmoji = watch("emoji") || "";

            const onEmojiClick = (emojiData: EmojiClickData) => {
              setValue("emoji", emojiData.emoji, {
                shouldValidate: true,
                shouldDirty: true,
              });
              close();
            };

            return (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Category
                    </Label>
                    <Input
                      id="name"
                      className={`py-2 ${
                        formState.errors["name"]
                          ? "border-red-500"
                          : "border-border"
                      }`}
                      placeholder="Enter new category here..."
                      error={formState.errors["name"]}
                      registration={register("name")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="emoji" className="text-sm font-medium">
                      Category Icon
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="flex items-center justify-center h-10 w-10 border border-border rounded-md bg-background"
                        aria-label="Selected emoji"
                      >
                        {selectedEmoji ? (
                          <span className="text-xl">{selectedEmoji}</span>
                        ) : (
                          <Smile className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <Button
                        type="button"
                        id="emoji-selector"
                        variant="outline"
                        onClick={open}
                        className="flex-1"
                      >
                        {selectedEmoji ? "Change Emoji" : "Select Emoji"}
                      </Button>

                      {/* Hidden input for the emoji field */}
                      <input type="hidden" id="emoji" {...register("emoji")} />
                    </div>
                    {formState.errors.emoji && (
                      <p className="text-sm text-red-500 mt-1">
                        {formState.errors.emoji.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Emoji Picker Dialog */}
                <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
                  <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    <DialogHeader className="px-4 pt-4 pb-0">
                      <DialogTitle>Select an Emoji</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        lazyLoadEmojis={true}
                        width="100%"
                        height="350px"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            );
          }}
        </Form>
      </FormDrawer>
    </>
  );
};

export default CreateQuestionCategoryForm;
