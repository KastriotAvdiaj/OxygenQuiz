// src/pages/Quiz/Sessions/components/type-the-answer-question.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import type { CurrentQuestion } from "../quiz-session-types";

interface TypeTheAnswerQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  primaryColor: string;
}

export function TypeTheAnswerQuestion({
  question,
  onSubmit,
  isSubmitting,
  primaryColor,
}: TypeTheAnswerQuestionProps) {
  const [answer, setAnswer] = useState<string>("");

  const handleSubmit = () => {
    // For type-the-answer questions, we pass null for selectedOptionId and the text as submittedAnswer
    onSubmit(null, answer.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && answer.trim() && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer here..."
            className="h-14 text-lg text-center border-2 rounded-lg transition-all duration-200 focus:ring-2"
            style={
              {
                borderColor: answer.trim() ? primaryColor : "#ffffff30",
                "--tw-ring-color": primaryColor,
              } as React.CSSProperties
            }
            disabled={isSubmitting}
            autoFocus
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-gray-400 text-center"
        >
          Press Enter or click Submit to answer
        </motion.div>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!answer.trim() || isSubmitting}
          size="lg"
          className="w-full max-w-xs text-xl"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? "Submitting..." : "Submit Answer"}
        </Button>
      </div>
    </div>
  );
}
