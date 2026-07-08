import { useMemo, useState } from "react";
import { UserRoundCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useNotifications } from "@/common/Notifications";
import { useUser } from "@/lib/Auth";
import { useRoles } from "../api/get-roles";
import { useUpdateUserRoles } from "../api/update-user-roles";

// The one role whose grant/removal is restricted to a SuperAdmin caller (mirrors the backend).
const SUPERADMIN = "SuperAdmin";

const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const lowered = new Set(a.map((r) => r.toLowerCase()));
  return b.every((r) => lowered.has(r.toLowerCase()));
};

type ChangeUserRoleProps = {
  user: { id: string; username: string; roles: string[] };
  closeDropDown: () => void;
};

export const ChangeUserRole = ({ user, closeDropDown }: ChangeUserRoleProps) => {
  const { addNotification } = useNotifications();
  const { data: currentUser } = useUser();
  const callerIsSuperAdmin = currentUser?.roles?.includes(SUPERADMIN) ?? false;

  const { isOpen, open, close } = useDisclosure();
  const { data: roles, isLoading: rolesLoading } = useRoles();

  const currentRoles = useMemo(() => user.roles ?? [], [user.roles]);
  const [selected, setSelected] = useState<string[]>(currentRoles);

  // Data-driven options from the server, minus SuperAdmin when the caller can't assign it.
  const options = useMemo(() => {
    const names = (roles ?? [])
      .map((r) => r.name)
      .filter((name): name is string => Boolean(name))
      .filter((name) => callerIsSuperAdmin || name.toLowerCase() !== SUPERADMIN.toLowerCase());
    return names.map((name) => ({ label: name, value: name }));
  }, [roles, callerIsSuperAdmin]);

  const mutation = useUpdateUserRoles({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Roles updated",
          message: `Updated roles for ${user.username}.`,
        });
        close();
        closeDropDown();
      },
      onError: (error: unknown) => {
        const data = (
          error as { response?: { data?: { title?: string; detail?: string } } }
        )?.response?.data;
        addNotification({
          type: "error",
          title: "Update failed",
          message: data?.detail || data?.title || "Couldn't update this user's roles.",
        });
      },
    },
  });

  const unchanged = sameSet(selected, currentRoles);
  const noneSelected = selected.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(next) => (next ? open() : close())}>
      <DialogTrigger asChild>
        <Button variant="userMenu" className="h-5 font-normal px-0 flex">
          <UserRoundCog size={16} /> Change Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change roles</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-foreground">
          <p className="text-sm text-muted-foreground">
            Choose the roles for{" "}
            <span className="font-semibold text-foreground">{user.username}</span>.
          </p>
          <MultiSelect<string>
            label="Roles"
            placeholder={rolesLoading ? "Loading roles…" : "Select roles"}
            options={options}
            selected={selected}
            onChange={setSelected}
          />
          {noneSelected && (
            <p className="text-xs text-destructive">Select at least one role.</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="addSave"
            className="rounded-sm text-white"
            isPending={mutation.isPending}
            disabled={mutation.isPending || unchanged || noneSelected}
            onClick={() => mutation.mutate({ userId: user.id, roles: selected })}
          >
            Save
          </Button>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeUserRole;
