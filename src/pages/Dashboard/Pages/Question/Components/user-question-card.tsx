import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Question } from "@/types/ApiTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/form";
export const UserQuestionCard: React.FC<{ question: Question }> = ({
  question,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleSubmit = () => {
    setShowAnswer(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">
            {question.question}
          </CardTitle>
          <Badge
            className={`${getDifficultyColor(
              question.difficultyDisplay
            )} text-white`}
          >
            {question.difficultyDisplay}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedAnswer || ""}
          onValueChange={setSelectedAnswer}
          className="space-y-4"
        >
          {question.answerOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem value={option.text} id={`${option.id}`} />
              <Label
                htmlFor={option.text}
                className="flex-grow p-3 rounded-md border transition-all duration-200 ease-in-out"
              >
                {option.text}
              </Label>
              {showAnswer && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {option.isCorrect ? (
                    <Check className="text-green-500" />
                  ) : (
                    <X className="text-red-500" />
                  )}
                </motion.div>
              )}
            </div>
          ))}
        </RadioGroup>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswer || showAnswer}
          >
            {showAnswer ? "Answer Revealed" : "Submit Answer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
