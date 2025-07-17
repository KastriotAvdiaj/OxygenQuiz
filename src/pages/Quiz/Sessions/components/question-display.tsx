// src/components/quiz/QuestionDisplay.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { QuizTimer } from './quiz-timer';
import type { CurrentQuestion } from '../quiz-session-types';

interface QuestionDisplayProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null) => void;
  isSubmitting: boolean;
  primaryColor: string;
}

export function QuestionDisplay({ question, onSubmit, isSubmitting, primaryColor }: QuestionDisplayProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  const handleTimeUp = () => {
    // When time is up, we submit a null answer.
    // The backend will know this is a timeout.
    onSubmit(null);
  };
  
  return (
    <motion.div
      // This key is VITAL. It tells React to re-render this component from scratch
      // whenever the question ID changes, which correctly resets all state, including the timer.
      key={question.quizQuestionId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="relative rounded-lg border-2 p-6 text-center"
        style={{ borderColor: primaryColor + '50', background: primaryColor + '10' }}
      >
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          <QuizTimer
            initialTime={question.timeRemainingInSeconds}
            onTimeUp={handleTimeUp}
            primaryColor={primaryColor}
          />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white">{question.questionText}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {question.options.map((option) => (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} key={option.id}>
            <Button
              onClick={() => setSelectedOptionId(option.id)}
              variant="outline"
              className="h-auto w-full justify-start whitespace-normal rounded-lg border-2 p-4 text-left text-lg transition-all duration-200"
              style={{
                '--primary-color': primaryColor, // Custom property for styling
                borderColor: selectedOptionId === option.id ? primaryColor : '#ffffff30',
                backgroundColor: selectedOptionId === option.id ? primaryColor + '25' : 'transparent',
              } as React.CSSProperties}
            >
              {option.text}
            </Button>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={() => onSubmit(selectedOptionId)}
          disabled={selectedOptionId === null || isSubmitting}
          size="lg"
          className="w-full max-w-xs text-xl"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      </div>
    </motion.div>
  );
}