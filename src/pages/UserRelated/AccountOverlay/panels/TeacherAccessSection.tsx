import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import {
  TEACHER_NOTE_MAX,
  useMyTeacherAccess,
  useRequestTeacherAccess,
} from "@/pages/Classroom/api/teacher-access";

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * "Teacher access" in the account panel (docs/auth/teacher-role.md §2.2): ask for the role, see
 * that the request is waiting, or why it was declined and when you may ask again. An Admin
 * answers in the dashboard; the answer also arrives as a notification.
 */
export const TeacherAccessSection = () => {
  const mine = useMyTeacherAccess();
  const request = useRequestTeacherAccess();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!mine.data) return null;
  const { isTeacher, latest, canRequest, canRequestAgainAt } = mine.data;

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-start gap-3">
        <GraduationCap
          aria-hidden
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm font-semibold">Teacher access</h3>

          {isTeacher ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re a Teacher: you can host boards for your class from the
              Classroom section of your dashboard.
            </p>
          ) : latest?.status === "Pending" ? (
            <p className="text-sm text-muted-foreground">
              Your request from {formatDay(latest.createdAt)} is waiting for an
              admin. You&apos;ll get a notification when it&apos;s answered.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Teachers host Associations boards for a class on one screen,
                with the class split into teams.
              </p>
              {latest?.status === "Declined" && (
                <p className="text-sm">
                  Your last request was declined
                  {latest.declineReason ? `: ${latest.declineReason}` : "."}
                  {canRequestAgainAt &&
                    ` You can ask again from ${formatDay(canRequestAgainAt)}.`}
                </p>
              )}
              {canRequest && !open && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(true)}
                >
                  Request teacher access
                </Button>
              )}
              {canRequest && open && (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    request.mutate(note, { onSuccess: () => setOpen(false) });
                  }}
                >
                  <Textarea
                    variant="minimal"
                    aria-label="Note for the admin"
                    placeholder="Optional — your school or subject"
                    maxLength={TEACHER_NOTE_MAX}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-[70px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      type="submit"
                      disabled={request.isPending}
                    >
                      Send request
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
