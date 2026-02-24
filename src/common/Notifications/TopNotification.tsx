import { useEffect, useState } from "react";
import { Info, CircleAlert, CircleX, CircleCheck, X, Timer, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const icons = {
  info: <Info className="size-5" aria-hidden="true" />,
  success: <CircleCheck className="size-5" aria-hidden="true" />,
  warning: <Timer className="size-5" aria-hidden="true" />,
  error: <CircleX className="size-5" aria-hidden="true" />,
};

const styles = {
  info: {
    bg: "from-blue-600/90 to-blue-700/90 border-blue-400/30",
    text: "text-white",
    icon: "text-blue-200",
    glow: "shadow-blue-500/20",
  },
  success: {
    bg: "from-emerald-600/90 to-emerald-700/90 border-emerald-400/30",
    text: "text-white",
    icon: "text-emerald-200",
    glow: "shadow-emerald-500/20",
  },
  warning: {
    bg: "from-amber-300/95 to-orange-400/95 border-amber-300/30",
    text: "text-white",
    icon: "text-amber-100",
    glow: "shadow-amber-500/30",
  },
  error: {
    bg: "from-red-600/90 to-red-700/90 border-red-400/30",
    text: "text-white",
    icon: "text-red-200",
    glow: "shadow-red-500/20",
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
              relative overflow-hidden rounded-2xl border
              bg-gradient-to-r ${style.bg}
              px-5 py-3.5 shadow-xl ${style.glow}
              backdrop-blur-xl min-w-[280px] max-w-[420px]
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
                    className={`text-sm font-bold leading-tight ${style.text}`}
                  >
                    {title}
                  </span>
                </div>
                {message && (
                  <span className="text-xs text-white/70 mt-0.5 leading-snug">
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
