import React from "react"; // Import useState
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDisclosure } from "@/hooks/use-disclosure";
import { PlusCircle } from "lucide-react";

interface CreatedQuestionsPanelProps {
  onAddPrivateQuestion: () => void;
}

export const CreatedQuestionsPanel: React.FC<CreatedQuestionsPanelProps> = ({
  onAddPrivateQuestion,
}) => {
  const { isOpen, open, close } = useDisclosure();

  const handleOpenChange = (shouldBeOpen: boolean) => {
    if (shouldBeOpen) {
      open();
    } else {
      close();
    }
  };

  return (
    <>
      <Card className="w-64 shadow-none border-none">
        <CardHeader className="border-b-2 border-muted">
          <CardTitle>Quiz Questions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-6">
          <Popover modal={true} open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild onClick={open}>
              <Button type="button" variant={"fancy"}>
                Add Question
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" className="w-auto p-4">
              <div className="flex flex-col gap-4">
                <Button onClick={close}>
                  <PlusCircle size={16} className="mr-2" /> Add Public Question
                </Button>

                <Button
                  onClick={() => {
                    close();
                    onAddPrivateQuestion();
                  }}
                >
                  <PlusCircle size={16} className="mr-2" /> Add Private Question
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={close}
        />
      )}
    </>
  );
};
