import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";
import { getAvatarColor } from "../../utils/avatar-colors";

export type AvatarState = "idle" | "submitted" | "correct" | "incorrect" | "noAnswer";

export interface AvatarClusterPlayer {
  username: string;
  profileImageUrl?: string | null;
  isCurrentUser?: boolean;
  state: AvatarState;
}

interface FloatingAvatarClusterProps {
  players: AvatarClusterPlayer[];
  /** sm = compact overlapping facepile (question-phase corner overlay). lg = spaced showcase row (countdown/reveal). */
  size?: "sm" | "lg";
  /** Pop a "{username} answered" toast whenever a player's state transitions into "submitted". */
  showToasts?: boolean;
  /** Print each player's name under their avatar. Switches the layout from an overlapping
   *  facepile to a wrapping, non-overlapping row so the labels have room. */
  showNames?: boolean;
  /** Gentle bobbing idle animation. Turn off for static contexts (e.g. the countdown, where
   *  motion would compete with the numeral). */
  float?: boolean;
  maxVisible?: number;
  className?: string;
}

const RING: Record<AvatarState, string> = {
  idle: "ring-border",
  submitted: "ring-emerald-500",
  correct: "ring-emerald-500",
  incorrect: "ring-red-500",
  noAnswer: "ring-muted-foreground/30",
};

const GLOW: Record<AvatarState, string> = {
  idle: "",
  submitted: "shadow-[0_0_12px_rgba(16,185,129,0.45)]",
  correct: "shadow-[0_0_16px_rgba(16,185,129,0.5)]",
  incorrect: "shadow-[0_0_16px_rgba(239,68,68,0.45)]",
  noAnswer: "",
};

const BADGE_BG: Record<AvatarState, string> = {
  idle: "",
  submitted: "bg-emerald-500",
  correct: "bg-emerald-500",
  incorrect: "bg-red-500",
  noAnswer: "bg-muted-foreground/70",
};

let toastSeq = 0;

/** Circular avatar with real-image + colored-initial fallback, shared by the cluster below and
 *  any standalone "spotlight" avatar (e.g. the match winner). */
export function AvatarCircle({
  username,
  profileImageUrl,
  className = "h-14 w-14",
  textClassName = "text-lg",
}: {
  username: string;
  profileImageUrl?: string | null;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={`${className} overflow-hidden rounded-full bg-card`}>
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt={username}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div
        className={`${profileImageUrl ? "hidden" : ""} flex h-full w-full items-center justify-center font-bold text-white ${getAvatarColor(username)} ${textClassName}`}
      >
        {username.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

export function FloatingAvatarCluster({
  players,
  size = "sm",
  showToasts = false,
  showNames = false,
  float = true,
  maxVisible = 4,
  className = "",
}: FloatingAvatarClusterProps) {
  const ordered = [
    ...players.filter((p) => p.isCurrentUser),
    ...players.filter((p) => !p.isCurrentUser),
  ];
  const visible = ordered.slice(0, maxVisible);
  const overflow = ordered.length - visible.length;

  const [toasts, setToasts] = useState<{ id: number; username: string }[]>([]);
  const prevSubmittedRef = useRef<string[]>([]);

  // Diff submitted-state usernames against the previous render to fire a toast exactly once
  // per submission, without needing a separate event feed from the caller.
  useEffect(() => {
    if (!showToasts) return;
    const submittedNow = players.filter((p) => p.state === "submitted").map((p) => p.username);
    const prev = prevSubmittedRef.current;
    const newlySubmitted = submittedNow.filter((u) => !prev.includes(u));
    prevSubmittedRef.current = submittedNow;
    if (newlySubmitted.length === 0) return;

    const entries = newlySubmitted.map((username) => ({ id: ++toastSeq, username }));
    setToasts((t) => [...t, ...entries]);
    entries.forEach((entry) => {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== entry.id));
      }, 2200);
    });
  }, [players, showToasts]);

  const avatarSize = size === "sm" ? "h-8 w-8 sm:h-9 sm:w-9" : "h-14 w-14 sm:h-16 sm:w-16";
  const badgeSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const iconSize = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  // Overlapping facepile only makes sense without labels; once names print underneath, each
  // avatar needs its own column so the label has room and can wrap on narrow phones.
  const rowClass = showNames
    ? "flex flex-wrap items-start justify-center gap-x-4 gap-y-3 sm:gap-x-5"
    : `flex items-end ${size === "sm" ? "-space-x-2.5" : "gap-3 sm:gap-4"}`;

  return (
    <div className={`relative ${className}`}>
      <div className={rowClass}>
        {visible.map((p, i) => (
          <motion.div
            key={p.username}
            className={`relative ${showNames ? "flex flex-col items-center" : ""}`}
            style={{ zIndex: visible.length - i }}
            animate={float ? { y: [0, -4, 0] } : undefined}
            transition={
              float
                ? { duration: 2.2 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }
                : undefined
            }
          >
            <div
              className={`${avatarSize} rounded-full border-2 border-background ring-2 transition-shadow duration-300 ${RING[p.state]} ${GLOW[p.state]}`}
            >
              <AvatarCircle
                username={p.username}
                profileImageUrl={p.profileImageUrl}
                className="h-full w-full"
                textClassName={size === "sm" ? "text-xs" : "text-lg"}
              />
            </div>

            <AnimatePresence>
              {p.state !== "idle" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={`absolute -bottom-0.5 -right-0.5 flex ${badgeSize} items-center justify-center rounded-full border-2 border-background ${BADGE_BG[p.state]}`}
                >
                  {p.state === "incorrect" ? (
                    <X className={`${iconSize} text-white`} strokeWidth={3} />
                  ) : p.state === "noAnswer" ? (
                    <Minus className={`${iconSize} text-white`} strokeWidth={3} />
                  ) : (
                    <Check className={`${iconSize} text-white`} strokeWidth={3} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {showNames && (
              <span className="mt-1.5 max-w-[3.5rem] truncate text-center text-[10px] font-semibold text-foreground/80 sm:max-w-[4.5rem] sm:text-xs">
                {p.username}
              </span>
            )}
          </motion.div>
        ))}

        {overflow > 0 && (
          <div className="flex flex-col items-center">
            <div
              className={`${avatarSize} flex items-center justify-center rounded-full border-2 border-background bg-muted font-bold text-muted-foreground ${size === "sm" ? "text-[10px]" : "text-sm"}`}
            >
              +{overflow}
            </div>
            {showNames && (
              <span className="mt-1.5 text-center text-[10px] font-semibold text-muted-foreground sm:text-xs">
                more
              </span>
            )}
          </div>
        )}
      </div>

      {showToasts && (
        <div
          className={`pointer-events-none absolute top-full z-30 mt-2 flex flex-col items-end gap-1.5 ${
            size === "sm" ? "right-0" : "left-1/2 right-auto -translate-x-1/2 items-center"
          }`}
        >
          <AnimatePresence>
            {toasts.slice(-3).map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/95 px-2.5 py-1 text-[11px] font-semibold shadow-md backdrop-blur-sm"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${getAvatarColor(t.username)}`} />
                {t.username} answered
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
