import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Springy enough to overshoot a little — the two choices pop out of the button, they don't slide. */
const SPRING = { type: "spring", stiffness: 460, damping: 22 } as const;

/**
 * Give up, in two clicks: an outlined button that, once pressed, springs out into the two
 * choices — Give up for real, or Keep playing — from where it stood. Keep playing folds them back.
 * Under reduced motion the choices simply appear.
 */
export const GiveUpControl = ({ onGiveUp, disabled }: { onGiveUp: () => void; disabled: boolean }) => {
  const [confirming, setConfirming] = useState(false);
  const reduceMotion = useReducedMotion();

  // Each choice starts on top of the button (to its right, scaled down) and springs to its place;
  // the further one travels further and a beat later.
  const choice = (distance: number, order: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : {
          initial: { opacity: 0, scale: 0.4, x: distance },
          animate: { opacity: 1, scale: 1, x: 0, transition: { ...SPRING, delay: order * 0.06 } },
          exit: { opacity: 0, scale: 0.4, x: distance, transition: { duration: 0.15 } },
        };

  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <AnimatePresence mode="popLayout" initial={false}>
        {confirming ? (
          <motion.div key="confirm" className="flex flex-wrap items-center justify-end gap-2">
            <motion.span
              // Its own line on a phone, so the two choices stay side by side.
              className="basis-full text-right text-muted-foreground sm:basis-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: reduceMotion ? 0 : 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              Reveal the board and end the game?
            </motion.span>
            <motion.div {...choice(96, 1)} style={{ originX: 1 }}>
              <Button size="sm" variant="destructive" onClick={onGiveUp} disabled={disabled}>
                <Flag className="mr-1 h-4 w-4" /> Give up
              </Button>
            </motion.div>
            <motion.div {...choice(24, 0)} style={{ originX: 1 }}>
              <Button size="sm" variant="outline" autoFocus onClick={() => setConfirming(false)}>
                Keep playing
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="give-up"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, transition: SPRING }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.6, transition: { duration: 0.12 } }}
          >
            <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
              <Flag className="mr-1 h-4 w-4" /> Give up
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
