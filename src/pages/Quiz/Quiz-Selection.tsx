import { useState } from "react";
import { QuizCard } from "./components/quiz-card";
import { QuizHeader } from "./components/quiz-header";
import { QuizFilters } from "./components/quiz-filters";
import { motion } from "framer-motion";
import {
  getCategoriedQuizzes,
  useCategoriedQuizzesData,
} from "./api/get-categorized-quizzes";

// interface Quiz {
//   id: string;
//   title: string;
//   description: string;
//   difficulty: "Beginner" | "Intermediate" | "Advanced";
//   questionCount: number;
//   category: string;
//   emoji: string;
//   color: string;
// }

// // Sample quiz data
// const quizzes: Quiz[] = [
//   {
//     id: "1",
//     title: "World History Fundamentals",
//     description:
//       "Test your knowledge of key historical events and figures throughout world history.",
//     difficulty: "Beginner",
//     questionCount: 15,
//     category: "History",
//     emoji: "🏛️",
//     color: "from-amber-400 to-orange-500",
//   },
//   {
//     id: "2",
//     title: "Advanced Physics Concepts",
//     description:
//       "Challenge yourself with complex physics problems and theoretical concepts.",
//     difficulty: "Advanced",
//     questionCount: 20,
//     category: "Science",
//     emoji: "⚛️",
//     color: "from-cyan-400 to-blue-500",
//   },
//   {
//     id: "3",
//     title: "Literature Classics",
//     description:
//       "Explore famous works of literature and their authors from around the world.",
//     difficulty: "Intermediate",
//     questionCount: 25,
//     category: "Literature",
//     emoji: "📚",
//     color: "from-purple-400 to-indigo-500",
//   },
//   {
//     id: "4",
//     title: "Geography Challenge",
//     description:
//       "Test your knowledge of countries, capitals, landmarks, and geographical features.",
//     difficulty: "Intermediate",
//     questionCount: 30,
//     category: "Geography",
//     emoji: "🌍",
//     color: "from-green-400 to-emerald-500",
//   },
//   {
//     id: "5",
//     title: "Computer Science Basics",
//     description:
//       "Learn fundamental concepts in computer science and programming.",
//     difficulty: "Beginner",
//     questionCount: 15,
//     category: "Technology",
//     emoji: "💻",
//     color: "from-slate-400 to-slate-600",
//   },
//   {
//     id: "6",
//     title: "Mathematical Puzzles",
//     description:
//       "Solve challenging mathematical problems and puzzles that test logical thinking.",
//     difficulty: "Advanced",
//     questionCount: 18,
//     category: "Mathematics",
//     emoji: "🧮",
//     color: "from-rose-400 to-pink-500",
//   },
//   {
//     id: "7",
//     title: "General Knowledge",
//     description:
//       "Test your knowledge across a wide range of topics and subjects.",
//     difficulty: "Beginner",
//     questionCount: 25,
//     category: "General",
//     emoji: "🧠",
//     color: "from-yellow-400 to-amber-500",
//   },
//   {
//     id: "8",
//     title: "Music Theory",
//     description:
//       "Explore the fundamentals of music theory, notation, and composition.",
//     difficulty: "Intermediate",
//     questionCount: 20,
//     category: "Arts",
//     emoji: "🎵",
//     color: "from-violet-400 to-purple-500",
//   },
// ];

export function QuizSelection() {
  const [searchQuery, setSearchQuery] = useState("");
  const quizzes = useCategoriedQuizzesData({}).data || [];

  // const [difficultyFilter, setDifficultyFilter] = useState("all");
  // const [categoryFilter, setCategoryFilter] = useState("all");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background overflow-y-auto to-background/80 pb-20 text-foreground">
      <QuizHeader />

      <div className="container mx-auto px-4">
        <QuizFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <QuizCard quiz={quiz} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
