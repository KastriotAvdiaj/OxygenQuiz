import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui";
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
  
    const currentQuestion = existingQuestions.find(q => q.id === selected);
  
    return (
      <div className="flex flex-col">
        <div className="mb-2">
          {currentQuestion ? (
            <div className="p-2 border rounded">
              <span className="font-medium">{currentQuestion.text}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {currentQuestion.category} - {currentQuestion.difficulty}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No question selected</span>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Select Question</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Select a Public Question</DialogTitle>
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
              <ScrollArea className="h-[300px]">
                {filteredQuestions.map((question) => (
                  <Card key={question.id} className="mb-2">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        {question.text}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {question.category} - {question.difficulty}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            onSelect(question);
                            setDialogOpen(false);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </CardContent>
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
  