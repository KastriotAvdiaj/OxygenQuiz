import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Clock, User, Calendar, X } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { secondsToMinutes } from "./quiz-card";

interface QuizStartModalProps {
  quiz: QuizSummaryDTO;
  isOpen: boolean;
  onClose: () => void;
  onStartQuiz: (quizId: number) => void;
}

export function QuizStartModal({
  quiz,
  isOpen,
  onClose,
  onStartQuiz,
}: QuizStartModalProps) {
  const primaryColor = quiz.colorPaletteJson
    ? JSON.parse(quiz.colorPaletteJson)[0]
    : "#6366f1";

  const handleStartQuiz = () => {
    onStartQuiz(quiz.id);
    onClose();
  };

  const formatDate = (date: string | Date) => {
    if (!date) return "Unknown";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md mx-auto border-2 text-white"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}85, ${primaryColor}45)`,
          borderColor: `${primaryColor}60`,
          backdropFilter: "blur(30px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className="text-xs font-medium px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: `${primaryColor}25`,
                  borderColor: `${primaryColor}50`,
                  color: primaryColor,
                }}
              >
                {quiz.category}
              </Badge>
            </div>

            <DialogTitle className="text-xl font-bold leading-tight text-left pr-8 text-white">
              {quiz.title}
            </DialogTitle>

            {quiz.description && (
              <DialogDescription className="text-sm text-muted-foreground text-left">
                {quiz.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Quiz details */}
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle
                  className="h-4 w-4"
                  style={{ color: primaryColor }}
                />
                <span className="font-medium">Questions</span>
                <span className="text-gray-400">{quiz.questionCount}</span>
              </div>

              {quiz.timeLimitInSeconds && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                  <span className="font-medium">Time limit</span>
                  <span className="text-gray-400">
                    {secondsToMinutes(quiz.timeLimitInSeconds)}
                  </span>
                </div>
              )}
            </div>

            {/* Creator and date info */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              {quiz.user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" style={{ color: primaryColor }} />
                  <span className="font-medium">Created by</span>
                  <span className="text-gray-400">{quiz.user}</span>
                </div>
              )}

              {quiz.createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar
                    className="h-4 w-4"
                    style={{ color: primaryColor }}
                  />
                  <span className="font-medium">Created</span>
                  <span className="text-gray-400">
                    {formatDate(quiz.createdAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center mt-6">
            <Button
              onClick={handleStartQuiz}
              variant="fancy"
              fancyColors={{
                primary: `${primaryColor}`,
                secondary: `${primaryColor}`,
                shadow: `${primaryColor}90`,
                text: "#ffffff",
                border: "#fecaca",
              }}
              className="px-6 py-6 group/button border-2 text-white hover:opacity-90 transition-opacity !font-secondary !text-2xl"
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              }}
            >
              {/* <Play className="h-4 w-4 mr-2" /> */}
              Start Quiz
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
