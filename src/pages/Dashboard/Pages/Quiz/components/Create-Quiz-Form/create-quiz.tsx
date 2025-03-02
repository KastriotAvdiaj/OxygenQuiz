import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuizDetails } from "./components/quiz-details";
import { PublicQuestions } from "./components/public-questions";
import { PrivateQuestions } from "./components/private-questions";
import { useQuizForm } from "./use-quiz-form";
import { createQuizInputSchema } from "../../api/create-quiz";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Steps from "@/common/Steps";
import { Card, CardDescription, CardHeader } from "@/components/ui";
import { useState } from "react";

export const CreateQuizForm = () => {
  const { queryData, handleSubmit, isSubmitting } = useQuizForm();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const handleStep = (direction: number) => {
    setCurrentStep((prevStep) => {
      const newStep = prevStep + direction;
      if (newStep < 1) return 1;
      if (newStep > totalSteps) return totalSteps;
      return newStep;
    });
  };

  if (queryData.isLoading) {
    return <div>Loading...</div>;
  }

  if (queryData.error) {
    return <div>Error loading quiz data</div>;
  }

  return (
    <Card className="p-6 bg-background border-none flex flex-col gap-2 items-center">
      <div className="flex flex-col space-y-2 pl-2 justify-center items-center">
        <CardHeader className="text-2xl font-bold p-0 ">
          Create New Quiz
        </CardHeader>
        <CardDescription className="p-0">
          Fill in the details below to create a new quiz.
        </CardDescription>
      </div>
      <Form
        id="create-quiz"
        className="mt-3 w-[50%]"
        onSubmit={handleSubmit}
        schema={createQuizInputSchema}
        options={{ mode: "onSubmit" }}
      >
        {(formProps) => (
          <div className="flex flex-col gap-2 justify-center ">
            <Steps currentStep={currentStep} totalSteps={totalSteps} />
            <QuizDetails formProps={formProps} queryData={queryData} />

            <Separator className="my-6" />

            <Tabs defaultValue="publicQuestions" className="w-[400px]">
              <TabsList>
                <TabsTrigger value="publicQuestions">
                  Public Questions
                </TabsTrigger>
                <TabsTrigger value="newQuestions">New Questions</TabsTrigger>
              </TabsList>
              <TabsContent value="publicQuestions">
                <PublicQuestions
                  formProps={formProps}
                  questions={queryData.questions}
                />
              </TabsContent>
              <TabsContent value="newQuestions">
                <PrivateQuestions formProps={formProps} queryData={queryData} />
              </TabsContent>
            </Tabs>

            <Button
              type="submit"
              variant="addSave"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : "Create Quiz"}
            </Button>
          </div>
        )}
      </Form>
    </Card>
  );
};

export default CreateQuizForm;
