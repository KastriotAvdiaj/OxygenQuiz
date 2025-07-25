import { useEffect, useState } from "react";
import { Info, CircleAlert, CircleX, CircleCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const icons = {
  info: <Info className="size-6 text-blue-500" aria-hidden="true" />,
  success: <CircleCheck className="size-6 text-green-500" aria-hidden="true" />,
  warning: (
    <CircleAlert className="size-6 text-yellow-500" aria-hidden="true" />
  ),
  error: <CircleX className="size-6 text-red-500" aria-hidden="true" />,
};

// Add corresponding border colors
const borderColors = {
  info: "border-l-blue-500",
  success: "border-l-green-500",
  warning: "border-l-yellow-500",
  error: "border-l-red-500",
};

export type NotificationProps = {
  notification: {
    id: string;
    type: keyof typeof icons;
    title: string;
    message?: string;
  };
  onDismiss: (id: string) => void;
  timeout?: number; // timeout in milliseconds (default: 5000ms)
};

export const Notification = ({
  notification: { id, type, title, message },
  onDismiss,
  timeout = 5000,
}: NotificationProps) => {
  const [visible, setVisible] = useState(true);

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
          className="z-50 flex w-full flex-col items-center space-y-4 sm:items-end"
          initial={{ opacity: 0, x: 150 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{
            opacity: 0,
            y: -50,
          }}
          transition={{ duration: 0.4 }}
          onAnimationComplete={(definition) => {
            if (definition === "exit") {
              onDismiss(id);
            }
          }}
        >
          <div
            className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5 z-50 border-l-4 ${
              borderColors[type]
            }`}
            role="alert"
            aria-label={title}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="shrink-0">{icons[type]}</div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="mt-1 text-sm text-gray-500">{message}</p>
                </div>
                <div className="ml-4 flex shrink-0">
                  <button
                    className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    onClick={() => setVisible(false)}
                  >
                    <span className="sr-only">Close</span>
                    <CircleX className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};