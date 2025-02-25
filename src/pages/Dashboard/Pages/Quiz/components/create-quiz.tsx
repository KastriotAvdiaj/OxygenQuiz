import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Label } from "@/components/ui/form";
// import { Textarea } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
// import { AddCustomQuestion } from "./add-custom-question"

interface QuestionDTO {
  ID: number;
  Text: string;
  Difficulty: string;
  User: UserBasicDTO;
  Category: string;
  TotalQuestions: number;
  AnswerOptions: AnswerOptionDTO[];
}

type UserBasicDTO = {};

type AnswerOptionDTO = {};

interface IndividualQuestionDTO extends QuestionDTO {
  DifficultyId: number;
  CategoryId: number;
  LanguageId: number;
  Language: string;
  UserId: string;
  CreatedAt: string;
}

export default function QuizCreator() {
  const [quizTitle, setQuizTitle] = useState("");
//   const [quizDescription, setQuizDescription] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<
    (QuestionDTO | IndividualQuestionDTO)[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for existing questions
  const existingQuestions: QuestionDTO[] = [
    {
      ID: 1,
      Text: "What is the capital of France?",
      Difficulty: "Easy",
      User: {},
      Category: "Geography",
      TotalQuestions: 1,
      AnswerOptions: [],
    },
    {
      ID: 2,
      Text: "Who wrote 'Romeo and Juliet'?",
      Difficulty: "Medium",
      User: {},
      Category: "Literature",
      TotalQuestions: 1,
      AnswerOptions: [],
    },
    {
      ID: 3,
      Text: "What is the chemical symbol for gold?",
      Difficulty: "Easy",
      User: {},
      Category: "Science",
      TotalQuestions: 1,
      AnswerOptions: [],
    },
  ];

  const filteredQuestions = existingQuestions.filter((question) =>
    question.Text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addQuestion = (question: QuestionDTO) => {
    setSelectedQuestions([...selectedQuestions, question]);
  };

  const removeQuestion = (questionId: number) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.ID !== questionId));
  };

//   const addCustomQuestion = (question: IndividualQuestionDTO) => {
//     setSelectedQuestions([...selectedQuestions, question]);
//   };

  return (
    <div className="container mx-auto p-4 text-foreground bg-background rounded-md shadow-md">
      <h1 className="text-2xl font-bold mb-4 ">Create a New Quiz</h1>
      <div className="space-y-4">
        <div>
          <Label htmlFor="quizTitle">Quiz Title</Label>
          <Input
            id="quizTitle"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Enter quiz title"
            className="bg-muted"
          />
        </div>
        <div>
          <Label htmlFor="quizDescription">Quiz Description</Label>
          {/* <Textarea
            id="quizDescription"
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Enter quiz description"
          /> */}
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Selected Questions</h2>
          <div className="space-y-2">
            {selectedQuestions.map((question) => (
              <Card key={question.ID}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {question.Text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {question.Category} - {question.Difficulty}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeQuestion(question.ID)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add Existing Questions</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Select Questions</DialogTitle>
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
                    <Card key={question.ID} className="mb-2">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">
                          {question.Text}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {question.Category} - {question.Difficulty}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => addQuestion(question)}
                          >
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
          {/* <AddCustomQuestion onAddQuestion={addCustomQuestion} /> */}
        </div>
        <Button>Create Quiz</Button>
      </div>
    </div>
  );
}
