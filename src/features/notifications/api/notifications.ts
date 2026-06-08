import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/Api-client";

/**
 * Persistent, server-side notification (the DB entity) — distinct from the
 * transient toast store in `@/common/Notifications`. Named `AppNotification`
 * to avoid clashing with the DOM `Notification` type.
 */
export type AppNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const notificationKeys = {
  all: ["notifications"] as const,
  list: (unreadOnly: boolean) => ["notifications", "list", unreadOnly] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

// ---- Queries ----

export const notificationsQueryOptions = (unreadOnly = false) =>
  queryOptions({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: async (): Promise<AppNotification[]> =>
      (await api.get("/Notifications", { params: { unreadOnly } })).data,
  });

export const useMyNotifications = (unreadOnly = false, enabled = true) =>
  useQuery({ ...notificationsQueryOptions(unreadOnly), enabled });

/**
 * Unread badge count. Polls on an interval so the bell stays roughly live even
 * without a SignalR connection; the push subscription invalidates this for
 * instant updates when connected.
 */
export const useUnreadCount = () =>
  useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async (): Promise<number> =>
      (await api.get("/Notifications/unread-count")).data.count,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

// ---- Mutations ----

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: notificationKeys.all });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/Notifications/${id}/read`),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/Notifications/read-all"),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/Notifications/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
};
