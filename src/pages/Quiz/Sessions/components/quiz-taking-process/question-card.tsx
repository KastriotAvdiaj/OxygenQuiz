import { motion } from "framer-motion";

interface QuestionCardProps {
  text: string;
  /** Optional extra classes on the wrapper (e.g. spacing tweaks per context). */
  className?: string;
  /**
   * Replaces the question text's size classes. Gameplay leaves this alone (the question is
   * the whole screen there); the landing page passes smaller sizes because the card shares
   * the screen with a headline and the category wheel.
   */
  textSizeClassName?: string;
}

/**
 * The styled "question text" card shared by singleplayer (`QuestionDisplay`) and the live
 * multiplayer match (`MultiplayerQuestionView`). Kept as one component so the gameplay look
 * stays identical across both modes — change it here and both update. See docs/deployment/known-issues.md
 * ("Multiplayer & singleplayer gameplay UIs diverged").
 */
export function QuestionCard({
  text,
  className = "",
  textSizeClassName = "text-lg sm:text-2xl md:text-3xl lg:text-4xl",
}: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}>
      {/* Compact base sizes: on phones the whole question screen should fit one
          viewport without scrolling (docs/RESPONSIVE.md). */}
      <div className="p-3 sm:p-6 md:p-8 text-center relative overflow-hidden rounded-xl border-2 border-primary bg-primary/20">
        <div className="absolute inset-0 opacity-3" />
        <h2 className={`${textSizeClassName} font-bold leading-snug sm:leading-relaxed relative z-10 tracking-wider`}>
          {text}
        </h2>
      </div>
    </motion.div>
  );
}
