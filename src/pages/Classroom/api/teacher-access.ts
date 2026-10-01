import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { classroomKeys } from "@/lib/query-keys";

/**
 * Asking for the Teacher role, and the Admin side of it (docs/auth/teacher-role.md §2).
 * Mirrors DTOs/Classroom/TeacherAccessDTOs.cs.
 */

export type TeacherAccessRequestStatus = "Pending" | "Approved" | "Declined";

export type TeacherAccessRequest = {
  id: number;
  userId: string;
  username: string;
  email: string;
  note: string | null;
  status: TeacherAccessRequestStatus;
  createdAt: string;
  decidedAt: string | null;
  declineReason: string | null;
};

export type MyTeacherAccess = {
  isTeacher: boolean;
  latest: TeacherAccessRequest | null;
  canRequestAgainAt: string | null;
  canRequest: boolean;
};

/** Mirrors TeacherAccessRequest.MaxNoteLength — the API is the rule, this is fast feedback. */
export const TEACHER_NOTE_MAX = 500;

export const useMyTeacherAccess = () =>
  useQuery({
    queryKey: classroomKeys.myTeacherAccess(),
    queryFn: async () => (await api.get("/teacher-access/mine")).data as MyTeacherAccess,
  });

export const useRequestTeacherAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) =>
      (await api.post("/teacher-access", { note: note.trim() || null })).data as MyTeacherAccess,
    onSuccess: (mine) => queryClient.setQueryData(classroomKeys.myTeacherAccess(), mine),
  });
};

export const useTeacherRequests = () =>
  useQuery({
    queryKey: classroomKeys.teacherRequests(),
    queryFn: async () =>
      (await api.get("/admin/teacher-requests")).data as TeacherAccessRequest[],
  });

export const useAnswerTeacherRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      answer: { id: number; approve: true } | { id: number; approve: false; reason: string },
    ) => {
      if (answer.approve) await api.post(`/admin/teacher-requests/${answer.id}/approve`);
      else
        await api.post(`/admin/teacher-requests/${answer.id}/decline`, {
          reason: answer.reason.trim() || null,
        });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classroomKeys.all }),
  });
};
