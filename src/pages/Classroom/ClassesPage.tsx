import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button, Card, Spinner } from "@/components/ui";
import {
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { LiftedButton } from "@/common/LiftedButton";
import {
  CLASS_LIMITS,
  parseStudents,
  useClasses,
  useDeleteClass,
  useSaveClass,
  type ClassRoster,
} from "./api/classes";

/**
 * `/my-dashboard/classes` — a Teacher's saved Classes (docs/quiz/classroom.md,
 * "Classes"): a name and the students' first names, one per line. Teams are formed from a Class
 * when hosting; a Class is optional there.
 */
export const ClassesPage = () => {
  const classes = useClasses();
  const [editing, setEditing] = useState<ClassRoster | "new" | null>(null);

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Classes</h1>
        <LiftedButton onClick={() => setEditing("new")} className="flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New class
        </LiftedButton>
      </div>

      {classes.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !classes.data?.length ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center bg-card border dark:border-foreground/30">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No classes yet. A class is optional — you can host with team names alone.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.data.map((c) => (
            <ClassCard key={c.id} roster={c} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      {editing && (
        <ClassEditor
          key={editing === "new" ? "new" : editing.id}
          roster={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

const ClassCard = ({ roster, onEdit }: { roster: ClassRoster; onEdit: () => void }) => {
  const remove = useDeleteClass();
  return (
    <Card className="flex flex-col gap-2 p-4 bg-card border dark:border-foreground/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{roster.name}</h2>
          <p className="text-sm text-muted-foreground">
            {roster.students.length} {roster.students.length === 1 ? "student" : "students"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" aria-label={`Edit ${roster.name}`} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmationDialog
            icon="danger"
            title={`Delete ${roster.name}?`}
            body="The class and its list of names are removed. Games you've already hosted keep their teams."
            isDone={remove.isSuccess}
            triggerButton={
              <Button size="icon" variant="ghost" aria-label={`Delete ${roster.name}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            confirmButton={
              <LiftedButton
                className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-1"
                liftColor="red-700"
                isPending={remove.isPending}
                type="button"
                onClick={() => remove.mutate(roster.id)}
              >
                Delete
              </LiftedButton>
            }
          />
        </div>
      </div>
      {roster.students.length > 0 && (
        <p className="line-clamp-2 text-sm">{roster.students.join(", ")}</p>
      )}
    </Card>
  );
};

const ClassEditor = ({ roster, onClose }: { roster: ClassRoster | null; onClose: () => void }) => {
  const save = useSaveClass();
  const { addNotification } = useNotifications();
  const [name, setName] = useState(roster?.name ?? "");
  const [text, setText] = useState(roster?.students.join("\n") ?? "");

  const students = parseStudents(text);
  const tooMany = students.length > CLASS_LIMITS.students;
  const tooLong = students.find((s) => s.length > CLASS_LIMITS.studentName);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{roster ? `Edit ${roster.name}` : "New class"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              { id: roster?.id, name, students },
              {
                onSuccess: (saved) => {
                  addNotification({ type: "success", title: `${saved.name} saved` });
                  onClose();
                },
              },
            );
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="class-name">Name</Label>
            <Input
              id="class-name"
              variant="minimal"
              placeholder="e.g. 7B"
              maxLength={CLASS_LIMITS.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-students">Students — one first name per line</Label>
            <Textarea
              id="class-students"
              variant="minimal"
              className="min-h-[220px]"
              placeholder={"Arta\nBlerim\nDea"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className={tooMany || tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {tooMany
                ? `${students.length} names — a class holds up to ${CLASS_LIMITS.students}.`
                : tooLong
                  ? `"${tooLong}" is longer than ${CLASS_LIMITS.studentName} characters.`
                  : `${students.length} of ${CLASS_LIMITS.students}. First names are enough; nobody gets an account.`}
            </p>
          </div>
          {/* The confirmation dialog's pair (ConfirmationDialog): the action first, lifted in its
              colour, then Cancel as a lifted outline on the dialog's background. */}
          <DialogFooter>
            <LiftedButton
              type="submit"
              className="py-1"
              disabled={!name.trim() || tooMany || !!tooLong}
              isPending={save.isPending}
            >
              Save
            </LiftedButton>
            <LiftedButton
              type="button"
              className="bg-background border border-foreground/30 text-sm text-foreground sm:text-base py-1"
              liftColor="muted"
              onClick={onClose}
            >
              Cancel
            </LiftedButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
