import { nanoid } from 'nanoid';
import { create } from 'zustand';

export type NotificationVariant = 'default' | 'top-center';

export type Notification = {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message?: string;
  variant?: NotificationVariant;
};

type NotificationsStore = {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
};

export const useNotifications = create<NotificationsStore>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => {
      // Dedupe: if an identical toast is already on screen, don't stack another.
      // A burst of failures from one underlying cause (e.g. the API rate limiter
      // rejecting a run of background calls with the same 429 message) should
      // read as ONE message, not an endless spam of copies. The duplicate is
      // simply dropped; once the visible one is dismissed or expires, the next
      // occurrence may appear again.
      const isDuplicate = state.notifications.some(
        (n) =>
          n.type === notification.type &&
          n.title === notification.title &&
          n.message === notification.message,
      );
      if (isDuplicate) return state;

      return {
        notifications: [
          ...state.notifications,
          { id: nanoid(), ...notification },
        ],
      };
    }),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    })),
}));
