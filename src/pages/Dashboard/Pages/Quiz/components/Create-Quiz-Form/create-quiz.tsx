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
import SelectQuestionComponent from "./components/question-select/question-select";
import { useQuiz } from "./Quiz-questions-context";
import { AnyQuestion } from "@/types/ApiTypes";
import { LiftedButton } from "@/common/LiftedButton";
import { CreatedQuestionsPanel } from "./components/questions-panel";
// import { QuestionCard } from "@/pages/Question/User-question-components/common-question-card";
import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";
import { createQuizInputSchema, useCreateQuiz } from "../../api/create-quiz";
import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";
import { Spinner, Switch } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { BsPatchQuestionFill } from "react-icons/bs";
import { ScoreSelect } from "./components/score-select";
import { TimeLimitSelect } from "./components/time-limit-select";
import { useNotifications } from "@/common/Notifications";
import { useNavigate } from "react-router";
import { QuestionCard } from "./components/quiz-question-card/main-quiz-question-card";

const CreateQuizForm = () => {
  const { queryData } = useQuizForm();
  const { selectedQuestions, displayQuestion } = useQuiz();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const createQuizMutation = useCreateQuiz({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Quiz Created Successfully!",
        });
        navigate("/dashboard/quizzes");
      },
    },
  });

  const [activeTab, setActiveTab] = useState("quiz");

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

  return (
    <Form
      id="create-quiz"
      className="mt-0 w-full"
      onSubmit={(values) => {
        const questions = selectedQuestions.map(
          (q: AnyQuestion, index: number) => ({
            questionId: q.id,
            timeLimitInSeconds: 10,
            pointSystem: "Standard",
            orderInQuiz: index,
          })
        );

        if (questions.length === 0) {
          return;
        }

        createQuizMutation.mutate({
          data: {
            ...values,
            questions: questions,
          },
        });
      }}
      schema={createQuizInputSchema}
      options={{ mode: "onSubmit" }}
    >
      {({ register, formState, setValue, watch, clearErrors }) => {
        useEffect(() => {
          const questions = selectedQuestions.map(
            (q: AnyQuestion, index: number) => ({
              questionId: q.id,
              timeLimitInSeconds: 10,
              pointSystem: "Standard",
              orderInQuiz: index,
            })
          );
          setValue("questions", questions);
        }, [selectedQuestions, setValue]);
        const { errors } = formState;
        console.log("Form errors:", errors);
        return (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 items-start">
            <Card className="md:text-xs lg:text-sm h-fit md:col-span-1 bg-background border-2 border-primary/30">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="w-full relative bg-primary/10 text-center border-b border-primary/30 px-2 py-4">
                  <TabsList className="w-full border-none bg-none shadow-none">
                    <TabsTrigger value="quiz">
                      <p className="flex gap-2 px-4 items-center">
                        <Brain
                          className={`h-5 w-5  ${
                            activeTab === "quiz" ? "text-white" : "text-primary"
                          }`}
                        />
                        Quiz Details
                      </p>
                    </TabsTrigger>
                    <TabsTrigger value="questions">
                      <p className="flex gap-2 px-4 items-center">
                        <BsPatchQuestionFill
                          className={`h-5 w-5  ${
                            activeTab === "questions"
                              ? "text-white"
                              : "text-primary"
                          }`}
                        />
                        Question Details
                      </p>
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <TabsContent value="questions" className="flex items-center">
                  <section className="w-[50%] flex flex-col gap-4 p-4">
                    <ScoreSelect />
                    <TimeLimitSelect />
                  </section>
                </TabsContent>
                <TabsContent value="quiz">
                  <CardContent className="bg-background space-y-4">
                    {/* Basic Information */}
                    <div className="space-y-2">
                      <div>
                        <Label
                          htmlFor="title"
                          className="text-sm font-medium flex items-center gap-1"
                        >
                          Quiz Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          variant="quiz"
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
                          variant="quiz"
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
                            setValue(
                              "difficultyId",
                              parseInt(selectedValue, 10)
                            )
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

                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Eye className="h-3 w-3" />
                          Visibility
                        </Label>
                        <Select
                          value={watch("visibility") || ""}
                          onValueChange={(value) =>
                            setValue("visibility", value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select visibility..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Public">Public</SelectItem>
                            <SelectItem value="Private">Private</SelectItem>
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
                </TabsContent>
              </Tabs>
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
                <LiftedButton
                  type="submit"
                  disabled={createQuizMutation?.isPending}
                  className="w-fit self-center relative"
                  variant="default"
                >
                  <div className="flex items-center justify-center">
                    <Spinner
                      size="sm"
                      className={`absolute ${
                        createQuizMutation.isPending ? "visible" : "invisible"
                      }`}
                    />
                    <span
                      className={
                        createQuizMutation.isPending ? "invisible" : "visible"
                      }
                    >
                      Finish
                    </span>
                  </div>
                </LiftedButton>
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
