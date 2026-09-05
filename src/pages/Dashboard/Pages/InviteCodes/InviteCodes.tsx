import { useMemo, useState } from "react";
import { Card, Spinner, Button } from "@/components/ui";
import { Plus, Copy, Check, Ban, Ticket } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  // DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotifications } from "@/common/Notifications";
import { useUser } from "@/lib/Auth";
import { useRoles } from "../User/api/get-roles";
import formatDate from "@/lib/date-format";
import { useInviteCodes, type InviteCodeStatus } from "./api/get-invite-codes";
import { useGenerateInviteCodes } from "./api/generate-invite-codes";
import { useRevokeInviteCode } from "./api/revoke-invite-code";
import { LiftedButton } from "@/common/LiftedButton";

// Derive a single human status from the DTO's timestamp fields.
type Derived = { label: string; tone: string };

const deriveStatus = (c: InviteCodeStatus): Derived => {
  if (c.consumedAt)
    return { label: "Used", tone: "text-muted-foreground border-border" };
  if (c.revokedAt)
    return { label: "Revoked", tone: "text-red-500 border-red-500/30" };
  if (c.expiresAt && new Date(c.expiresAt) <= new Date())
    return { label: "Expired", tone: "text-amber-600 border-amber-600/30" };
  return { label: "Available", tone: "text-green-600 border-green-600/30" };
};

// The default role every account gets; picking it here means "grant nothing extra".
// Mirrors RoleRules.DefaultRole / RoleRules.SuperAdminOnlyRoles on the backend.
const PLAIN_ROLE = "User";
const SUPERADMIN = "SuperAdmin";

export const InviteCodes = () => {
  const { addNotification } = useNotifications();
  const { data, isLoading, isError } = useInviteCodes();

  const { data: currentUser } = useUser();
  const callerIsSuperAdmin = currentUser?.roles?.includes(SUPERADMIN) ?? false;
  const { data: roles } = useRoles();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [role, setRole] = useState(PLAIN_ROLE);
  const [intendedEmail, setIntendedEmail] = useState("");

  // A code that grants a role is a far more valuable bearer secret than a tester invite, so the
  // API forces it to be single, expiring and bound to one address. Deriving this during render
  // (rather than storing it) keeps the form from ever disagreeing with the role that's selected.
  const isElevated = role !== PLAIN_ROLE;

  // Data-driven, minus SuperAdmin when the caller can't mint one — the same filter the Change
  // Roles dialog applies. The backend refuses it regardless; this just keeps the UI honest.
  const roleOptions = useMemo(() => {
    const names = (roles ?? [])
      .map((r) => r.name)
      .filter((name): name is string => Boolean(name))
      .filter(
        (name) => callerIsSuperAdmin || name.toLowerCase() !== SUPERADMIN.toLowerCase()
      );
    // Guarantee the plain option exists even if /Roles hasn't resolved yet.
    return names.includes(PLAIN_ROLE) ? names : [PLAIN_ROLE, ...names];
  }, [roles, callerIsSuperAdmin]);
  // Plaintext codes from the last generation — shown once, then dismissed.
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useGenerateInviteCodes({
    mutationConfig: {
      onSuccess: (result) => {
        setFreshCodes(result.codes);
        setCopied(false);
        addNotification({
          type: "success",
          title: "Codes generated",
          message: `${result.codes.length} invite code(s) created. Copy them now — they can't be re-read.`,
        });
      },
    },
  });

  const revoke = useRevokeInviteCode({
    mutationConfig: {
      onSuccess: () =>
        addNotification({
          type: "success",
          title: "Code revoked",
          message: "That invite code can no longer be redeemed.",
        }),
    },
  });

  const rows = data ?? [];

  const counts = useMemo(() => {
    let available = 0,
      used = 0,
      inactive = 0;
    for (const c of rows) {
      const s = deriveStatus(c).label;
      if (s === "Available") available++;
      else if (s === "Used") used++;
      else inactive++;
    }
    return { total: rows.length, available, used, inactive };
  }, [rows]);

  const submitGenerate = () => {
    // Client-side mirrors of the API rules in InviteCodeService.ValidateRails — fast feedback,
    // never the rule itself.
    const effectiveCount = isElevated ? 1 : count;

    if (effectiveCount < 1 || effectiveCount > 200) {
      addNotification({
        type: "error",
        title: "Invalid count",
        message: "Choose a batch size between 1 and 200.",
      });
      return;
    }

    if (isElevated && !expiresAt) {
      addNotification({
        type: "error",
        title: "Expiry required",
        message: `A code granting ${role} must expire. Pick a date.`,
      });
      return;
    }

    if (isElevated && !intendedEmail.trim()) {
      addNotification({
        type: "error",
        title: "Email required",
        message: `A code granting ${role} must be issued to a specific email address.`,
      });
      return;
    }

    generate.mutate({
      count: effectiveCount,
      label: label.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      role: isElevated ? role : undefined,
      intendedEmail: intendedEmail.trim() || undefined,
    });
  };

  const copyFresh = async () => {
    if (!freshCodes) return;
    await navigator.clipboard.writeText(freshCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    // Reset the form + any shown plaintext once the dialog is dismissed.
    setFreshCodes(null);
    setLabel("");
    setExpiresAt("");
    setCount(10);
    setRole(PLAIN_ROLE);
    setIntendedEmail("");
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invite Codes</h1>
          <p className="text-muted-foreground mt-1">
            Single-use codes that gate signup. Generate a batch, hand them out,
            and track which are still available.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiftedButton
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Generate codes
          </LiftedButton>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={counts.total} />
        <SummaryCard
          label="Available"
          value={counts.available}
          tone="text-green-600"
        />
        <SummaryCard label="Used" value={counts.used} />
        <SummaryCard
          label="Revoked / expired"
          value={counts.inactive}
          tone="text-red-500"
        />
      </div>

      {/* ── Table ── */}
      <Card className="p-6 bg-card border dark:border-foreground/30">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <p className="text-center text-red-500 py-8">
            Failed to load invite codes. Please try again later.
          </p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Ticket className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No invite codes yet. Generate a batch to gate signup.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Grants</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Issued to</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Used by</TableHead>
                <TableHead>Used at</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const s = deriveStatus(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline" className={s.tone}>
                        {s.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.grantedRole ? (
                        <Badge
                          variant="outline"
                          className="text-purple-600 border-purple-600/30"
                        >
                          {c.grantedRole}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">User</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.label || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.intendedEmail || (
                        <span className="text-muted-foreground">Anyone</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {c.expiresAt ? formatDate(c.expiresAt) : "Never"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.consumedByUsername || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {c.consumedAt ? formatDate(c.consumedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.isRedeemable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          disabled={revoke.isPending}
                          onClick={() => revoke.mutate(c.id)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Generate dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Generate invite codes</DialogTitle>
            {/* <DialogDescription>
              A batch of single-use codes. The plaintext is shown once here —
              copy it before closing, it can't be re-read later.
            </DialogDescription> */}
          </DialogHeader>

          {freshCodes ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {freshCodes.length} new code(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyFresh}
                  className="flex items-center gap-1.5"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy all"}
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/40 p-3 font-mono text-sm">
                {freshCodes.map((code) => (
                  <div key={code} className="py-0.5">
                    {code}
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600">
                Save these now. Once you close this dialog they're gone — only
                usage status is visible afterwards.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="role">Grants role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" variant="minimal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isElevated
                    ? `Whoever redeems this code becomes a ${role}. One code, expiring, for one named address.`
                    : "A normal account. Hand these out freely."}
                </p>
              </div>

              {!isElevated && (
                <div className="space-y-1.5">
                  <Label htmlFor="count">How many</Label>
                  <Input
                    id="count"
                    type="number"
                    variant="minimal"
                    min={1}
                    max={200}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="intendedEmail"
                  className={isElevated ? "" : "text-muted-foreground"}
                >
                  {isElevated ? "Issued to" : "Issued to (optional)"}
                </Label>
                <Input
                  id="intendedEmail"
                  type="email"
                  variant="minimal"
                  placeholder="person@example.com"
                  value={intendedEmail}
                  onChange={(e) => setIntendedEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {isElevated
                    ? "Required. Only a signup using this address can redeem the code, so a leaked code is useless."
                    : "Bind the code to one address. Leave blank for a code anyone may redeem."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-muted-foreground">
                  Label (optional)
                </Label>
                <Input
                  id="label"
                  variant="minimal"
                  placeholder='e.g. "beta testers" or "batch 1"'
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="expiresAt"
                  className={isElevated ? "" : "text-muted-foreground"}
                >
                  {isElevated ? "Expires" : "Expires (optional)"}
                </Label>
                {/* minDate=today: an invite code that expired before it was issued is
                    nonsense. The calendar portals out of the dialog by default — see
                    DatePicker for why that beats rendering it in place. */}
                <DatePicker
                  id="expiresAt"
                  value={expiresAt}
                  onChange={setExpiresAt}
                  placeholder="No expiry"
                  minDate={new Date()}
                />
                <p className="text-xs text-muted-foreground">
                  {isElevated
                    ? "Required for a role-granting code — it must stop working on its own."
                    : "Leave blank for codes that never expire."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {freshCodes ? (
              <Button onClick={closeDialog}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <LiftedButton
                  onClick={submitGenerate}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? "Generating…" : "Generate"}
                </LiftedButton>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) => (
  <Card className="p-4 bg-card border dark:border-foreground/30">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-2xl font-bold ${tone ?? ""}`}>{value}</p>
  </Card>
);
