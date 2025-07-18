// src/pages/Quiz/Sessions/components/true-or-false-question.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { CurrentQuestion } from "../quiz-session-types";

interface TrueOrFalseQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null) => void;
  isSubmitting: boolean;
  primaryColor: string;
}

export function TrueOrFalseQuestion({
  question,
  onSubmit,
  isSubmitting,
  primaryColor,
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
          <Button
            onClick={() => setSelectedOptionId(trueOption.id)}
            variant="outline"
            className="h-auto w-full justify-center whitespace-normal rounded-lg border-2 p-6 text-center text-xl font-semibold transition-all duration-200"
            style={
              {
                "--primary-color": primaryColor, // Custom property for styling
                borderColor:
                  selectedOptionId === trueOption.id
                    ? primaryColor
                    : "#ffffff30",
                backgroundColor:
                  selectedOptionId === trueOption.id
                    ? primaryColor + "25"
                    : "transparent",
              } as React.CSSProperties
            }
          >
            {trueOption.text}
          </Button>
        </motion.div>

        {/* False Button */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setSelectedOptionId(falseOption.id)}
            variant="outline"
            className="h-auto w-full justify-center whitespace-normal rounded-lg border-2 p-6 text-center text-xl font-semibold transition-all duration-200"
            style={
              {
                "--primary-color": primaryColor, // Custom property for styling
                borderColor:
                  selectedOptionId === falseOption.id
                    ? primaryColor
                    : "#ffffff30",
                backgroundColor:
                  selectedOptionId === falseOption.id
                    ? primaryColor + "25"
                    : "transparent",
              } as React.CSSProperties
            }
          >
            {falseOption.text}
          </Button>
        </motion.div>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={() => onSubmit(selectedOptionId)}
          disabled={selectedOptionId === null || isSubmitting}
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
