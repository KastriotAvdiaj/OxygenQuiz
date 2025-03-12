// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { api } from "@/lib/Api-client";
// import { MutationConfig } from "@/lib/React-query";
// import { Question } from "@/types/ApiTypes";

// export const createQuestion = ({ data }: { data: number }): Promise<> => {
//   return (
//     console.log("data", data),
//     api.post('/questions', data));
// };

// type UseCreateQuestionOptions = {
//   mutationConfig?: MutationConfig<typeof createQuestion>;
// };

// export const useCreateQuestion = ({ mutationConfig }: UseCreateQuestionOptions = {}) => {
//   const queryClient = useQueryClient();
  
//   const { onSuccess, onError, ...restConfig } = mutationConfig || {};

//   return useMutation({
//     mutationFn: createQuestion,
//     onSuccess: (...args) => {
//       queryClient.invalidateQueries({ queryKey: getQuestionsQueryOptions().queryKey });
//       onSuccess?.(...args);
//     },
//     onError: (error, variables, context) => {
//       console.error('Error creating question:', error);
//       onError?.(error, variables, context);
//     },
//     ...restConfig,
//   });
// };