import { useEffect, useState } from "react";
import { Info, CircleX, CircleCheck, X, Timer } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const icons = {
  info: <Info className="size-5" aria-hidden="true" />,
  success: <CircleCheck className="size-5" aria-hidden="true" />,
  warning: <Timer className="size-5" aria-hidden="true" />,
  error: <CircleX className="size-5" aria-hidden="true" />,
};


const styles = {
  info: {
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    progress: "bg-blue-500",
  },
  success: {
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
    progress: "bg-emerald-500",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    progress: "bg-amber-500",
  },
  error: {
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    progress: "bg-red-500",
  },
};

export type TopNotificationProps = {
  notification: {
    id: string;
    type: keyof typeof icons;
    title: string;
    message?: string;
  };
  onDismiss: (id: string) => void;
  timeout?: number;
};

export const TopNotification = ({
  notification: { id, type, title, message },
  onDismiss,
  timeout = 5000,
}: TopNotificationProps) => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const style = styles[type];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / timeout) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setVisible(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [timeout]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
          }}
          onAnimationComplete={(definition) => {
            if (definition === "exit") {
              onDismiss(id);
            }
          }}
        >
          <div
            className={`
              relative overflow-hidden rounded-2xl border-4 ${style.border}
              bg-background font-quiz
              px-5 py-3.5 shadow-xl
              min-w-[280px] max-w-[420px]
            `}
            role="alert"
            aria-label={title}
          >
            {/* Animated background shimmer */}
            <motion.div
              className="absolute inset-0 opacity-10"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            <div className="relative flex items-center gap-3">
              {/* Icon with pulse effect */}
              <motion.div
                className={`flex-shrink-0 ${style.icon}`}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: 1,
                  ease: "easeInOut",
                }}
              >
                {icons[type]}
              </motion.div>

              {/* Content */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-bold leading-tight `}
                  >
                    {title}
                  </span>
                </div>
                {message && (
                  <span className="text-xs text-foreground/70 mt-0.5 leading-snug">
                    {message}
                  </span>
                )}
              </div>

              {/* Dismiss button */}
              <button
                className="flex-shrink-0 ml-1 rounded-full p-1 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                onClick={() => setVisible(false)}
              >
                <span className="sr-only">Close</span>
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
              <motion.div
                className="h-full bg-white/40 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
