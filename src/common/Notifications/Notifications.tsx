import { Notification } from "./Notification";
import { TopNotification } from "./TopNotification";
import { useNotifications } from "./Notifications-store";

export const Notifications = () => {
  const { notifications, dismissNotification } = useNotifications();

  const defaultNotifications = notifications.filter(
    (n) => !n.variant || n.variant === "default"
  );
  const topCenterNotifications = notifications.filter(
    (n) => n.variant === "top-center"
  );

  return (
    <>
      {/* Default variant — bottom-left sidebar toasts */}
      {defaultNotifications.length > 0 && (
        <div
          aria-live="assertive"
          className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end space-y-4 px-4 py-6 sm:items-start sm:p-6"
        >
          {defaultNotifications.map((notification) => (
            <Notification
              key={notification.id}
              notification={notification}
              onDismiss={dismissNotification}
            />
          ))}
        </div>
      )}

      {/* Top-center variant — clean centered toasts */}
      {topCenterNotifications.length > 0 && (
        <div
          aria-live="assertive"
          className="pointer-events-none fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4"
        >
          {topCenterNotifications.map((notification) => (
            <TopNotification
              key={notification.id}
              notification={notification}
              onDismiss={dismissNotification}
            />
          ))}
        </div>
      )}
    </>
  );
};
