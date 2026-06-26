import { motion } from "framer-motion";

interface QuestionCardProps {
  text: string;
  /** Optional extra classes on the wrapper (e.g. spacing tweaks per context). */
  className?: string;
}

/**
 * The styled "question text" card shared by singleplayer (`QuestionDisplay`) and the live
 * multiplayer match (`MultiplayerQuestionView`). Kept as one component so the gameplay look
 * stays identical across both modes — change it here and both update. See docs/known-issues.md
 * ("Multiplayer & singleplayer gameplay UIs diverged").
 */
export function QuestionCard({ text, className = "" }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}>
      <div className="quiz-card-elevated p-4 sm:p-6 md:p-8 text-center relative overflow-hidden rounded-xl border-2 border-dashed border-primary bg-primary/20">
        <div className="absolute inset-0 opacity-3" />
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-relaxed relative z-10 tracking-wider">
          {text}
        </h2>
      </div>
    </motion.div>
  );
}
