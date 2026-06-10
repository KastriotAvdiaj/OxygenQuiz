import { Fragment, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import type { Permission, PermissionMatrix as Matrix } from "@/types/permission-types";

type PermissionMatrixProps = {
  matrix: Matrix;
  onToggle: (roleId: number, permissionId: number, grant: boolean) => void;
  isCellPending: (roleId: number, permissionId: number) => boolean;
};

// Group permissions by their resource (the part before the first ":"), keeping the
// order the backend sent them in. Renders one labelled section per resource.
const groupByResource = (permissions: Permission[]) => {
  const groups: { resource: string; items: Permission[] }[] = [];
  for (const permission of permissions) {
    let group = groups.find((g) => g.resource === permission.resource);
    if (!group) {
      group = { resource: permission.resource, items: [] };
      groups.push(group);
    }
    group.items.push(permission);
  }
  return groups;
};

// Strip the resource prefix so the row label reads "update:any" instead of
// "question:update:any" — the resource is already the section header.
const shortLabel = (name: string) => {
  const i = name.indexOf(":");
  return i < 0 ? name : name.slice(i + 1);
};

export const PermissionMatrix = ({
  matrix,
  onToggle,
  isCellPending,
}: PermissionMatrixProps) => {
  const groups = useMemo(
    () => groupByResource(matrix.permissions),
    [matrix.permissions]
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[16rem]">Permission</TableHead>
          {matrix.roles.map((role) => (
            <TableHead key={role.id} className="text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold">{role.name}</span>
                {role.isSystem && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    full access
                  </Badge>
                )}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {groups.map((group) => (
          <Fragment key={group.resource}>
            {/* Resource section header */}
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableCell
                colSpan={matrix.roles.length + 1}
                className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.resource}
              </TableCell>
            </TableRow>

            {group.items.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell>
                  <div className="font-mono text-sm">
                    {shortLabel(permission.name)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {permission.description}
                  </div>
                </TableCell>

                {matrix.roles.map((role) => {
                  const granted = role.permissionIds.includes(permission.id);
                  return (
                    <TableCell key={role.id} className="text-center">
                      <div className="flex justify-center">
                        <Switch
                          checked={granted}
                          disabled={
                            role.isSystem ||
                            isCellPending(role.id, permission.id)
                          }
                          onCheckedChange={(value) =>
                            onToggle(role.id, permission.id, value)
                          }
                          aria-label={`${granted ? "Revoke" : "Grant"} ${
                            permission.name
                          } for ${role.name}`}
                        />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
};
