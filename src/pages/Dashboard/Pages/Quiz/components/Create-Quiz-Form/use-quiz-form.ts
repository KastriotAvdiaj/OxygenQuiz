import { useNavigate } from "react-router-dom";
import { useQuestionData } from "../../../Question/api/get-questions";
import { useQuestionCategoryData } from "../../../Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../../../Question/Entities/Difficulty/api/get-question-difficulties";
import { useCreateQuiz } from "../../api/create-quiz";
import { useQuestionLanguageData } from "../../../Question/Entities/Language/api/get-question-language";
import { CreateQuizInput } from "../../api/create-quiz";
import { useNotifications } from "@/common/Notifications";

export const useQuizForm = () => {
  const navigate = useNavigate();
    const { addNotification } = useNotifications();
  
  
  const questionsQuery = useQuestionData({});
  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  const createQuizMutation = useCreateQuiz({
    mutationConfig: {
      onSuccess: () => {addNotification({
        type: "success",
        title: "Quiz Created",
      });
      navigate("/dashboard/quizzes")},
    },
  });

  const queryData = {
    questions: questionsQuery.data?.items ?? [],
    categories: categoriesQuery.data ?? [],
    difficulties: difficultiesQuery.data ?? [],
    languages: languagesQuery.data ?? [],
    isLoading: questionsQuery.isLoading || categoriesQuery.isLoading || 
               difficultiesQuery.isLoading || languagesQuery.isLoading,
    error: questionsQuery.error || categoriesQuery.error || 
           difficultiesQuery.error || languagesQuery.error
  };

  const handleSubmit = (values: CreateQuizInput) => {
    console.log(values);
    createQuizMutation.mutate({ data: values });
  };

  return {
    queryData,
    handleSubmit,
    isSubmitting: createQuizMutation.isPending,
  };
};