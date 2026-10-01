import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { classroomKeys } from "@/lib/query-keys";

/** A Teacher's Classes (docs/quiz/classroom.md, "Classes"). Mirrors DTOs/Classroom/ClassDTOs.cs. */
export type ClassRoster = {
  id: number;
  name: string;
  students: string[];
  updatedAt: string;
};

export type SaveClassInput = { name: string; students: string[] };

/** Mirror Class.MaxStudents / MaxNameLength / ClassStudent.MaxNameLength — the API is the rule. */
export const CLASS_LIMITS = { students: 40, name: 40, studentName: 30 } as const;

/** One name per line, blank lines dropped, whitespace collapsed — what the API will store. */
export const parseStudents = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 0);

export const useClasses = (enabled = true) =>
  useQuery({
    queryKey: classroomKeys.classes(),
    queryFn: async () => (await api.get("/classes")).data as ClassRoster[],
    enabled,
  });

export const useSaveClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: SaveClassInput & { id?: number }) =>
      (id ? await api.put(`/classes/${id}`, input) : await api.post("/classes", input)).data as ClassRoster,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classroomKeys.classes() }),
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/classes/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classroomKeys.classes() }),
  });
};
