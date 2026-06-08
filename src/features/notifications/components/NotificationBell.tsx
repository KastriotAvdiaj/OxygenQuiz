import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/Spinner";
import formatDate from "@/lib/date-format";
import {
  useMyNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type AppNotification,
} from "../api/notifications";
import { useNotificationHub } from "./use-notification-hub";

/**
 * Header bell for persistent, server-side notifications (NOT the transient toasts).
 * Shows an unread badge, and on open lists the user's notifications with
 * mark-read / mark-all / delete actions. Render only for authenticated users.
 */
export const NotificationBell = () => {
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadCount();
  // Fetch the list lazily — only when the dropdown is open.
  const { data: notifications = [], isLoading } = useMyNotifications(false, open);

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  // Real-time: invalidate the queries when the server pushes a new notification.
  useNotificationHub();

  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
          className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent/50 transition-colors text-foreground"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {badge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 bg-background">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              You're all caught up.
            </p>
          ) : (
            notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={() => !n.isRead && markRead.mutate(n.id)}
                onDelete={() => remove.mutate(n.id)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NotificationRow = ({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: AppNotification;
  onMarkRead: () => void;
  onDelete: () => void;
}) => (
  <div
    onClick={onMarkRead}
    className={`group flex gap-2.5 px-4 py-3 border-b border-border/60 cursor-pointer transition-colors hover:bg-accent/40 ${
      notification.isRead ? "" : "bg-primary/5"
    }`}
  >
    <span
      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
        notification.isRead ? "bg-transparent" : "bg-primary"
      }`}
    />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium truncate">{notification.title}</p>
        {!notification.isRead && (
          <Check className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {notification.message}
      </p>
      <p className="text-[11px] text-muted-foreground/70 mt-1">
        {formatDate(notification.createdAt)}
      </p>
    </div>
    <button
      aria-label="Delete notification"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className="self-start text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

export default NotificationBell;
