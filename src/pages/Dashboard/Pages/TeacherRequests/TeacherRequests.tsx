import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Card, Spinner, Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form/input";
import { useNotifications } from "@/common/Notifications";
import formatDate from "@/lib/date-format";
import {
  useAnswerTeacherRequest,
  useTeacherRequests,
  type TeacherAccessRequest,
} from "@/pages/Classroom/api/teacher-access";

/**
 * `/dashboard/teacher-requests` — users asking for the Teacher role, pending first
 * (docs/auth/teacher-role.md §2.2). Approving grants the role through the same service as the
 * Users table; declining starts the user's 30-day wait. Either way the user is notified.
 */
export const TeacherRequests = () => {
  const { data, isLoading, isError } = useTeacherRequests();
  const pending = data?.filter((r) => r.status === "Pending") ?? [];
  const answered = data?.filter((r) => r.status !== "Pending") ?? [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Teacher Requests</h1>
        <p className="text-muted-foreground mt-1">
          People asking to host boards for a class. You can also grant Teacher from the Users table, or with an invite code.
        </p>
      </div>

      <Card className="p-6 bg-card border dark:border-foreground/30">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-red-500">Failed to load requests. Please try again later.</p>
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No requests yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Waiting ({pending.length})</h2>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing waiting.</p>
              ) : (
                pending.map((r) => <PendingRow key={r.id} request={r} />)
              )}
            </section>
            {answered.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold">Answered</h2>
                <ul className="divide-y divide-border">
                  {answered.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                      <span className="font-medium">{r.username}</span>
                      <span className="text-muted-foreground">{r.email}</span>
                      <Badge variant={r.status === "Approved" ? "default" : "outline"}>{r.status}</Badge>
                      {r.decidedAt && <span className="text-muted-foreground">{formatDate(r.decidedAt)}</span>}
                      {r.declineReason && <span className="text-muted-foreground">— {r.declineReason}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

const PendingRow = ({ request }: { request: TeacherAccessRequest }) => {
  const answer = useAnswerTeacherRequest();
  const { addNotification } = useNotifications();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const done = (title: string) => () => addNotification({ type: "success", title });

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{request.username}</span>
        <span className="text-sm text-muted-foreground">{request.email}</span>
        <span className="text-xs text-muted-foreground">asked {formatDate(request.createdAt)}</span>
      </div>
      {request.note && <p className="mt-1 text-sm">{request.note}</p>}
      {declining ? (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            answer.mutate({ id: request.id, approve: false, reason }, { onSuccess: done("Request declined") });
          }}
        >
          <Input
            variant="minimal"
            aria-label="Reason (optional, shown to the user)"
            placeholder="Reason (optional, shown to the user)"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            className="min-w-[220px] flex-1"
          />
          <Button size="sm" type="submit" variant="destructive" disabled={answer.isPending}>
            Decline
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => setDeclining(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            disabled={answer.isPending}
            onClick={() => answer.mutate({ id: request.id, approve: true }, { onSuccess: done(`${request.username} is now a Teacher`) })}
          >
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDeclining(true)}>
            Decline…
          </Button>
        </div>
      )}
    </div>
  );
};
