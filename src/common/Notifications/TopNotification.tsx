import { useEffect, useState } from "react";
import { Info, CircleAlert, CircleX, CircleCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const icons = {
  info: <Info className="size-4" aria-hidden="true" />,
  success: <CircleCheck className="size-4" aria-hidden="true" />,
  warning: <CircleAlert className="size-4" aria-hidden="true" />,
  error: <CircleX className="size-4" aria-hidden="true" />,
};

const styles = {
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-400",
    icon: "text-blue-400",
  },
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-400",
    icon: "text-emerald-400",
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-400",
    icon: "text-amber-400",
  },
  error: {
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-400",
    icon: "text-red-400",
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
  timeout = 4000,
}: TopNotificationProps) => {
  const [visible, setVisible] = useState(true);
  const style = styles[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onAnimationComplete={(definition) => {
            if (definition === "exit") {
              onDismiss(id);
            }
          }}
        >
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md ${style.bg}`}
            role="alert"
            aria-label={title}
          >
            <span className={`flex-shrink-0 ${style.icon}`}>
              {icons[type]}
            </span>
            <div className="flex flex-col min-w-0">
              <span
                className={`text-sm font-medium leading-tight ${style.text}`}
              >
                {title}
              </span>
              {message && (
                <span className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {message}
                </span>
              )}
            </div>
            <button
              className={`flex-shrink-0 ml-2 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity ${style.text}`}
              onClick={() => setVisible(false)}
            >
              <span className="sr-only">Close</span>
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
