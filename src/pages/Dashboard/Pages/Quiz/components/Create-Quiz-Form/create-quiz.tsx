import { Form, Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useQuizForm } from "./use-quiz-form";
import {
  Brain,
  Trophy,
  PlusCircle,
  Clock,
  Eye,
  Shuffle,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SelectQuestionComponent from "./components/question-select";
import { useQuiz } from "./QuizQuestionsContext";
import { AnyQuestion } from "@/types/ApiTypes";
import { LiftedButton } from "@/common/LiftedButton";
import { CreatedQuestionsPanel } from "./components/questions-panel";
import { QuestionCard } from "@/pages/Question/User-question-components/common-question-card";
import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";
import { createQuizInputSchema } from "../../api/create-quiz";
import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";
import { Switch } from "@/components/ui";

const CreateQuizForm = () => {
  const { queryData } = useQuizForm();
  const { selectedQuestions, displayQuestion } = useQuiz();

  if (queryData.isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (queryData.error) {
    return (
      <div className="w-full p-8 text-center text-destructive">
        <Brain className="mx-auto h-16 w-16 mb-4 opacity-70" />
        <h3 className="text-xl font-bold">Oops! Brain freeze!</h3>
        <p>Error loading quiz data. Please try again.</p>
      </div>
    );
  }

  const handleFormSubmit = async () => {
    const finalQuizData = {
      questionsFromBank: selectedQuestions.map((q: AnyQuestion) => q.id),
    };
    console.log("Submitting Quiz with Data:", finalQuizData);
  };

  // const formatTimeDisplay = (seconds: number) => {
  //   if (seconds === 0) return "No limit";
  //   const minutes = Math.floor(seconds / 60);
  //   const remainingSeconds = seconds % 60;
  //   return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  // };

  return (
    <Form
      id="create-quiz"
      className="mt-0 w-full"
      onSubmit={handleFormSubmit}
      schema={createQuizInputSchema}
      options={{ mode: "onSubmit" }}
    >
      {({ register, formState, setValue, watch, clearErrors }) => {
        const { errors } = formState;
        console.log("Form errors:", errors);

        // const timeLimitValue = watch("timeLimitInSeconds") || 0;

        return (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 items-start">
            <Card className="md:text-xs lg:text-sm h-fit md:col-span-1 bg-background border-2 border-primary/30">
              <CardHeader className="w-full relative bg-primary/10 p-4 text-center border-b border-primary/30">
                <h2 className="text-xl flex items-center justify-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Quiz Details
                </h2>
              </CardHeader>
              <CardContent className="p-4 bg-background space-y-4">
                {/* Basic Information */}
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="title"
                      className="text-sm font-medium flex items-center gap-1"
                    >
                      Quiz Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter quiz title..."
                      className="mt-1"
                      {...register("title")}
                      error={errors.title}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your quiz..."
                      className="mt-1 min-h-[80px] resize-none"
                      {...register("description")}
                      error={errors.description}
                    />
                  </div>
                </div>

                <Separator className="bg-primary/20" />

                <div className="space-y-3">
                  <div>
                    <CategorySelect
                      categories={queryData.categories}
                      value={watch("categoryId")?.toString() || ""}
                      onChange={(selectedValue: string) =>
                        setValue("categoryId", parseInt(selectedValue, 10))
                      }
                      includeAllOption={false}
                      error={formState.errors["categoryId"]?.message}
                      clearErrors={() => clearErrors("categoryId")}
                    />
                  </div>

                  <div>
                    <DifficultySelect
                      difficulties={queryData.difficulties}
                      value={watch("difficultyId")?.toString() || ""}
                      onChange={(selectedValue: string) =>
                        setValue("difficultyId", parseInt(selectedValue, 10))
                      }
                      includeAllOption={false}
                      error={formState.errors["difficultyId"]?.message}
                      clearErrors={() => clearErrors("difficultyId")}
                    />
                  </div>

                  <div>
                    <LanguageSelect
                      languages={queryData.languages}
                      value={watch("languageId")?.toString() || ""}
                      includeAllOption={false}
                      onChange={(selectedValue: string) =>
                        setValue("languageId", parseInt(selectedValue, 10))
                      }
                      error={formState.errors["languageId"]?.message}
                      clearErrors={() => clearErrors("languageId")}
                    />
                  </div>
                </div>

                <Separator className="bg-primary/20" />

                {/* Quiz Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Quiz Settings
                  </h4>

                  {/* Time Limit */}
                  {/* <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Time Limit: {formatTimeDisplay(timeLimitValue)}
                    </Label>
                    <Input
                      type="range"
                      min="0"
                      max="7200"
                      step="60"
                      value={timeLimitValue}
                      onChange={(e) =>
                        setValue("timeLimitInSeconds", parseInt(e.target.value))
                      }
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>No limit</span>
                      <span>2 hours</span>
                    </div>
                  </div> */}

                  {/* Visibility */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Eye className="h-3 w-3" />
                      Visibility
                    </Label>
                    <Select
                      value={watch("visibility") || ""}
                      onValueChange={(value) => setValue("visibility", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select visibility..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">🌍 Public</SelectItem>
                        <SelectItem value="private">🔒 Private</SelectItem>
                        {/* <SelectItem value="unlisted">🔗 Unlisted</SelectItem> */}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-primary/20" />

                {/* Toggle Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">
                    Options
                  </h4>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="showFeedback"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      💬 Instant Feedback
                    </Label>
                    <Switch
                      id="showFeedback"
                      checked={watch("showFeedbackImmediately") || false}
                      onCheckedChange={(checked) =>
                        setValue("showFeedbackImmediately", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="shuffleQuestions"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <Shuffle className="h-3 w-3" />
                      Shuffle Questions
                    </Label>
                    <Switch
                      id="shuffleQuestions"
                      checked={watch("shuffleQuestions") || false}
                      onCheckedChange={(checked) =>
                        setValue("shuffleQuestions", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="isPublished"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <Upload className="h-3 w-3" />
                      Publish Quiz
                    </Label>
                    <Switch
                      id="isPublished"
                      checked={watch("isPublished") || false}
                      onCheckedChange={(checked) =>
                        setValue("isPublished", checked)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background justify-center border-2 border-primary/30 rounded-xl shadow-lg flex flex-col items-center w-full overflow-hidden md:col-span-3">
              <CardHeader className="w-full relative bg-primary/10 p-4 text-center border-b border-primary/30">
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Quiz Creator
                  <Trophy className="h-6 w-6 text-primary" />
                </h2>
                <p className="text-muted-foreground">
                  Craft your perfect quiz challenge!
                </p>
                <section className="flex absolute top-0 right-0 justify-center gap-4 p-4 rounded-lg">
                  <SelectQuestionComponent />
                  <LiftedButton type="button">+ Create New</LiftedButton>
                </section>
              </CardHeader>

              <CardContent className="flex flex-col w-full p-4">
                {displayQuestion !== null ? (
                  <QuestionCard question={displayQuestion} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed border-primary/20 rounded-lg w-full">
                    <Brain className="h-16 w-16 mb-4 text-primary/50" />
                    <p className="mb-4 text-lg">Your quiz is feeling empty!</p>
                    <Button
                      variant="outline"
                      className="group hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    >
                      <PlusCircle className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                      Add Your First Question
                    </Button>
                  </div>
                )}
                <Separator className="my-6 bg-primary/20" />
                <Button
                  type="submit"
                  disabled={formState?.isSubmitting}
                  className="w-fit self-center"
                  variant="default"
                >
                  Create Quiz
                </Button>
              </CardContent>
            </Card>

            <div className="md:col-span-1">
              <CreatedQuestionsPanel />
            </div>
          </div>
        );
      }}
    </Form>
  );
};

export default CreateQuizForm;
