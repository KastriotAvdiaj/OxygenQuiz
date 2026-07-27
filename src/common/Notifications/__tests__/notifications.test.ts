import { renderHook, act } from '@testing-library/react';

import { useNotifications, Notification } from '../Notifications-store';

test('should add and remove notifications', () => {
  const { result } = renderHook(() => useNotifications());

  expect(result.current.notifications.length).toBe(0);

  const notification: Notification = {
    id: '123',
    title: 'Hello World',
    type: 'info',
    message: 'This is a notification',
  };

  act(() => {
    result.current.addNotification(notification);
  });

  expect(result.current.notifications).toContainEqual(notification);

  act(() => {
    result.current.dismissNotification(notification.id);
  });

  expect(result.current.notifications).not.toContainEqual(notification);
});

test('drops a duplicate while an identical notification is visible, allows it again after dismissal', () => {
  const { result } = renderHook(() => useNotifications());

  const toast = {
    title: 'Error',
    type: 'error' as const,
    message: 'Too many requests. Please slow down and try again in a moment.',
  };

  // A burst of identical failures (e.g. rate-limited background calls) must collapse to ONE toast.
  act(() => {
    result.current.addNotification(toast);
    result.current.addNotification(toast);
    result.current.addNotification(toast);
  });
  expect(result.current.notifications.length).toBe(1);

  // A different message still gets through.
  act(() => {
    result.current.addNotification({ ...toast, message: 'Something else' });
  });
  expect(result.current.notifications.length).toBe(2);

  // Once the visible copy is gone, the same message may appear again.
  const firstId = result.current.notifications[0].id;
  act(() => {
    result.current.dismissNotification(firstId);
    result.current.addNotification(toast);
  });
  expect(result.current.notifications.length).toBe(2);
});
