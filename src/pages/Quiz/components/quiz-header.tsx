import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

export function QuizHeader() {
  return (
    <div className="relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/80"
              style={{
                width: `${Math.random() * 50 + 10}px`,
                height: `${Math.random() * 50 + 10}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 text-center relative">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center justify-center mb-4 bg-primary/10 px-4 py-2 rounded-full">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            <span className="font-medium text-primary">Challenge Your Mind</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Quiz Adventure
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Embark on a journey of knowledge and fun with our collection of interactive quizzes!
          </p>
        </motion.div>
      </div>
    </div>
  )
}