import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, Spinner } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { usePermissionMatrix } from "./api/get-permission-matrix";
import { useUpdateRolePermission } from "./api/update-role-permission";
import { PermissionMatrix } from "./components/PermissionMatrix";

const cellKey = (roleId: number, permissionId: number) =>
  `${roleId}:${permissionId}`;

export const Permissions = () => {
  const { data, isLoading, isError, refetch, isFetching } = usePermissionMatrix();
  const { addNotification } = useNotifications();

  // Track which individual cells have a request in flight so we can disable just
  // those toggles (the rest stay interactive thanks to optimistic updates).
  const [pendingCells, setPendingCells] = useState<Set<string>>(new Set());

  const mutateCell = (key: string, add: boolean) =>
    setPendingCells((prev) => {
      const next = new Set(prev);
      add ? next.add(key) : next.delete(key);
      return next;
    });

  const { mutate } = useUpdateRolePermission({
    mutationConfig: {
      onError: () =>
        addNotification({
          type: "error",
          title: "Could not update permission",
          message: "Your change was reverted. Please try again.",
        }),
    },
  });

  const isCellPending = useCallback(
    (roleId: number, permissionId: number) =>
      pendingCells.has(cellKey(roleId, permissionId)),
    [pendingCells]
  );

  const handleToggle = useCallback(
    (roleId: number, permissionId: number, grant: boolean) => {
      const key = cellKey(roleId, permissionId);
      mutateCell(key, true);
      mutate(
        { roleId, permissionId, grant },
        { onSettled: () => mutateCell(key, false) }
      );
    },
    [mutate]
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Permissions</h1>
          <p className="text-muted-foreground mt-1">
            Grant or revoke what each role can do. Changes apply on each user's
            next request. SuperAdmin always has full access.
          </p>
        </div>
        <LiftedButton
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0 px-3 py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </LiftedButton>
      </div>

      <Card className="p-6 bg-card border dark:border-foreground/30">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <p className="text-center text-red-500 py-8">
            Failed to load permissions. Please try again later.
          </p>
        ) : !data || data.permissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No permissions are defined.
          </p>
        ) : (
          <PermissionMatrix
            matrix={data}
            onToggle={handleToggle}
            isCellPending={isCellPending}
          />
        )}
      </Card>
    </div>
  );
};
