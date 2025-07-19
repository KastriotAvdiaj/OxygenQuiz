// src/pages/Quiz/Sessions/components/true-or-false-question.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { CurrentQuestion } from "../quiz-session-types";

interface TrueOrFalseQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

export function TrueOrFalseQuestion({
  question,
  onSubmit,
  isSubmitting,
  theme,
}: TrueOrFalseQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  // True/False questions have specific option IDs: 1 for True, 0 for False
  const trueOption = { id: 1, text: "True" };
  const falseOption = { id: 0, text: "False" };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* True Button */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <button
            onClick={() => setSelectedOptionId(trueOption.id)}
            className={`quiz-answer-option w-full text-center text-xl font-semibold p-6 ${
              selectedOptionId === trueOption.id ? "selected" : ""
            }`}
            style={{
              borderColor:
                selectedOptionId === trueOption.id ? theme.primary : undefined,
              backgroundColor:
                selectedOptionId === trueOption.id
                  ? `${theme.primary}15`
                  : undefined,
            }}
          >
            ✓ {trueOption.text}
          </button>
        </motion.div>

        {/* False Button */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <button
            onClick={() => setSelectedOptionId(falseOption.id)}
            className={`quiz-answer-option w-full text-center text-xl font-semibold p-6 ${
              selectedOptionId === falseOption.id ? "selected" : ""
            }`}
            style={{
              borderColor:
                selectedOptionId === falseOption.id ? theme.primary : undefined,
              backgroundColor:
                selectedOptionId === falseOption.id
                  ? `${theme.primary}15`
                  : undefined,
            }}
          >
            ✗ {falseOption.text}
          </button>
        </motion.div>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={() => onSubmit(selectedOptionId)}
          disabled={selectedOptionId === null || isSubmitting}
          size="lg"
          className="w-full max-w-xs text-xl"
          style={{ backgroundColor: theme.primary }}
        >
          {isSubmitting ? "Submitting..." : "Submit Answer"}
        </Button>
      </div>
    </div>
  );
}
