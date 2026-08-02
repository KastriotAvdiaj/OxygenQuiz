import { useEffect, useRef, useState } from "react";
import type { LobbyChatMessage } from "./use-lobby-chat";

interface UseChatUnreadOptions {
  messages: LobbyChatMessage[];
  /** The current account — their own messages never count as unread. */
  username: string;
  /**
   * Whether chat is currently visible. On desktop the panel is always on screen, so nothing is
   * ever unread; on mobile this is the drawer's open state.
   */
  isVisible: boolean;
}

/**
 * Counts messages that arrived while chat wasn't on screen, for the mobile chat button's badge.
 *
 * Only *incoming* messages count. Your own are excluded (you just sent them) and so are system
 * notices like "Ana joined" — a badge that fires on room churn trains people to ignore it, which
 * defeats the point of having one.
 *
 * Counting works off the length of the message list rather than message identity: lobby chat has
 * no message ids, `sentUtc` can collide, and the list is capped at MAX_MESSAGES so it can shift
 * from the front. Tracking "how many have I seen" and diffing the tail is the only thing that
 * stays correct once that cap starts trimming.
 */
export const useChatUnread = ({ messages, username, isVisible }: UseChatUnreadOptions) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const seenCountRef = useRef(messages.length);

  useEffect(() => {
    // Visible chat is read chat: consume everything and keep the marker at the end.
    if (isVisible) {
      seenCountRef.current = messages.length;
      setUnreadCount(0);
      return;
    }

    // The capped list dropped older entries, so indices shifted under us. Treat everything
    // currently held as seen rather than counting the whole list as new.
    if (messages.length < seenCountRef.current) {
      seenCountRef.current = messages.length;
      return;
    }

    const arrived = messages.slice(seenCountRef.current);
    seenCountRef.current = messages.length;
    if (arrived.length === 0) return;

    const worthAnnouncing = arrived.filter(
      (m) => !m.isSystem && m.username !== username,
    ).length;

    if (worthAnnouncing > 0) setUnreadCount((prev) => prev + worthAnnouncing);
  }, [messages, isVisible, username]);

  return unreadCount;
};
