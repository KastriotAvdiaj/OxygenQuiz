// src/features/chat/api/use-llm-chat.ts

import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';

// Step 1: Import the new, dedicated API client
import { MutationConfig } from '@/lib/React-query'; // Assuming you have this type defined
import { llmApi } from '../Api-client';

// Step 2: Define the input and output types to match your FastAPI backend
// This ensures type safety between your frontend and backend.

// Zod schema for validating the input on the client-side
export const llmChatInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty.'),
});

// TypeScript type inferred from the Zod schema
export type LlmChatInput = z.infer<typeof llmChatInputSchema>;

// The expected shape of a successful response from the /chat endpoint
export type LlmChatResponse = {
  response: string;
  status: 'success';
};

// Step 3: Define the asynchronous API call function
// This is the function that `useMutation` will execute.
export const llmChat = ({
  data,
}: {
  data: LlmChatInput;
}): Promise<LlmChatResponse> => {
  // Use the `llmApi` client to send a POST request to the `/chat` endpoint.
  // The base URL (`http://localhost:8000`) is already configured in the client.
  return llmApi.post('/chat', data);
};

// Step 4: Define and export the custom `useMutation` hook
type UseLlmChatOptions = {
  mutationConfig?: MutationConfig<typeof llmChat>;
};

export const useLlmChat = ({ mutationConfig }: UseLlmChatOptions = {}) => {
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: llmChat, // The function to call when `mutate` is executed
    onSuccess: (...args) => {
      console.log('LLM chat response received successfully.');
      onSuccess?.(...args);
    },
    // Spread the rest of the configuration. This allows you to pass
    // `onError`, `onSettled`, etc., from the component where you use the hook.
    ...restConfig,
  });
};