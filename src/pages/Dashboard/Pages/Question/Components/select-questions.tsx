import { Button, Card } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Question } from "@/types/ApiTypes";
import { Search } from "lucide-react";
import { useState } from "react";
import { NormalQuestionCard } from "./normal-question-card";

interface SelectQuestionsProps {
  selected?: number; // currently selected question id
  onSelect: (question: Question) => void;
  error?: string | null;
  existingQuestions: Question[];
}

export const SelectQuestions: React.FC<SelectQuestionsProps> = ({
  selected,
  onSelect,
  error,
  existingQuestions,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredQuestions = existingQuestions.filter((question) =>
    question.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentQuestion = existingQuestions.find((q) => q.id === selected);

  return (
    <div className="flex flex-col justify-center">
      <div className="mb-2">
        {currentQuestion ? (
          <div className="p-2 rounded">
            <NormalQuestionCard
              question={currentQuestion}
              showActionButtons={false}
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground flex items-center justify-center p-2">
            No question selected
          </span>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-fit self-center bg-primary/80">Select Question</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select a Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[400px] p-4 rounded border border-background/60">
              {filteredQuestions.map((question) => (
                <Card key={question.id} className="mb-2 border-none">
                  <div className="flex flex-col justify-between items-end">
                    <NormalQuestionCard
                      showActionButtons={false}
                      question={question}
                    />
                    <Button
                      className="m-2"
                      size="sm"
                      onClick={() => {
                        onSelect(question);
                        setDialogOpen(false);
                      }}
                    >
                      Select
                    </Button>
                  </div>
                </Card>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default SelectQuestions;
