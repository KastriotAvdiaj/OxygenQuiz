import { Notification } from "./Notification";
import { useNotifications } from "./Notifications-store";

export const Notifications = () => {
  const { notifications, dismissNotification } = useNotifications();

  return (
    <>
      {notifications.length > 0 && (
        <div
          aria-live="assertive"
          className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end space-y-4 px-4 py-6 sm:items-start sm:p-6"
        >
          {notifications.map((notification) => (
            <Notification
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
