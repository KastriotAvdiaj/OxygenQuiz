import { motion } from "framer-motion";

export function QuizHeader() {
  return (
    <div className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-16 md:py-24 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 font-header">
            Quiz Adventure
          </h1>
        </motion.div>
      </div>
    </div>
  );
}
