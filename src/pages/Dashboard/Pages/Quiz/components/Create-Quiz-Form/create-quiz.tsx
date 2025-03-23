import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuizDetails } from "./components/quiz-details";
import { PublicQuestions } from "./components/public-questions";
import { PrivateQuestions } from "./components/private-questions";
import { useQuizForm } from "./use-quiz-form";
import { createQuizInputSchema } from "../../api/create-quiz";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader } from "@/components/ui";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useDisclosure } from "@/hooks/use-disclosure";
import { PlusCircle, Search, SearchCheck } from "lucide-react";
import { CreatedQuestionsPanel } from "./components/questions-panel";

export const CreateQuizForm = () => {
  const { queryData, handleSubmit, isSubmitting } = useQuizForm();
  // const { close, open, isOpen } = useDisclosure();

  if (queryData.isLoading) {
    return <div>Loading...</div>;
  }

  if (queryData.error) {
    return <div>Error loading quiz data</div>;
  }

  return (
    <>
      <div className="flex flex-col space-y-2 p-4 justify-center items-center text-primary">
        {/* <CardHeader className="text-5xl font-bold p-0">
          Create Your Quiz
        </CardHeader>
        <CardDescription className="p-0 text-primary text-xl">
          Design engaging quizzes with our easy-to-use builder
        </CardDescription> */}
      </div>
      <Card className="bg-background justify-center border-none flex flex-col gap-2 items-center">
        <Form
          id="create-quiz"
          className="mt-0 w-full"
          onSubmit={handleSubmit}
          schema={createQuizInputSchema}
          options={{ mode: "onSubmit" }}
        >
          {(formProps) => (
            <div className="flex flex-col md:flex-row gap-6">
              <QuizDetails formProps={formProps} queryData={queryData} />
              {/* Main Section: Public/Private Questions */}
              <div className="flex-1 p-6">
                <Tabs defaultValue="publicQuestions" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger
                      value="publicQuestions"
                      className="w-full flex gap-2"
                    >
                      <Search size={16} />
                      Browse Public
                    </TabsTrigger>
                    <TabsTrigger
                      value="newQuestions"
                      className="w-full flex gap-2"
                    >
                      <PlusCircle size={16} /> Create New
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="publicQuestions">
                    <PublicQuestions
                      formProps={formProps}
                      questions={queryData.questions}
                    />
                  </TabsContent>
                  <TabsContent
                    className="flex justify-center"
                    value="newQuestions"
                  >
                    <PrivateQuestions
                      formProps={formProps}
                      queryData={queryData}
                    />
                  </TabsContent>
                </Tabs>
                <Separator className="my-6" />
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Submitting..." : "Create Quiz"}
                </Button>
              </div>
              <div className="border-l-2 border-muted">
                <CreatedQuestionsPanel />
              </div>
            </div>
          )}
        </Form>
      </Card>
    </>
  );
};

export default CreateQuizForm;
