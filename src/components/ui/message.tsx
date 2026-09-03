import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

/**
 * shadcn's `Message` primitive (the AI Elements registry entry), ported to this project.
 *
 * Trimmed to the two parts a chat transcript actually needs. Upstream also ships branch
 * navigation, an actions toolbar, attachments and a `MessageResponse` that renders markdown
 * through `streamdown` — all of which pull in the `ai` and `streamdown` packages and the
 * `button-group` component for a lobby chat that sends plain 500-character strings. The
 * markup and class names below are upstream's, unchanged apart from `cn`'s import path and
 * dropping a Tailwind v4 variant this project's v3 can't parse.
 *
 * The `is-user` / `is-assistant` marker class on the wrapper is what the content styles hang
 * off (`group-[.is-user]:…`), so the alignment and bubble live in one place instead of in a
 * ternary at every call site.
 */

/** Upstream types this as `UIMessage["role"]` from the `ai` package, which isn't installed. */
export type MessageRole = "user" | "assistant" | "system";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: MessageRole;
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
      "group-[.is-assistant]:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
