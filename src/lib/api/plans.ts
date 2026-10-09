import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { planKeys } from "@/lib/query-keys";

/**
 * Paid plans (docs/auth/paid-plans.md). Mirrors DTOs/Billing/PlanDTOs.cs.
 *
 * <b>Every limit here is fast feedback, never the rule.</b> The API enforces each one at a single
 * place (PlanLimitGuard, the hub's lobby clamp, the AI quota policy) and answers a refusal with a
 * `PlanLimitReached` 403 that Api-client turns into the upgrade toast.
 */
export type PlanTier = "Free" | "Plus" | "Teacher";

export type PlanLimits = {
  /** null: no daily count (staff). */
  aiDailyGenerations: number | null;
  /** null: unlimited. */
  maxOwnedQuizzes: number | null;
  maxLobbyPlayers: number;
  /** null: unlimited. */
  maxClasses: number | null;
};

export type Plan = {
  tier: PlanTier;
  name: string;
  monthlyEur: number;
  yearlyEur: number;
  limits: PlanLimits;
};

export type PlanCatalog = {
  plans: Plan[];
  /** False until a payment provider is configured — the pricing page says "coming soon". */
  checkoutAvailable: boolean;
};

export type MyPlan = {
  plan: PlanTier;
  isStaff: boolean;
  limits: PlanLimits;
  planEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
};

export type UserPlanAdmin = MyPlan & {
  userId: string;
  /** The manual grant while it counts — never "Free". */
  manualPlan: Exclude<PlanTier, "Free"> | null;
  manualEndsAt: string | null;
  manualNote: string | null;
};

export type SetManualPlanInput = {
  /** "Plus" | "Teacher", or null to revoke. */
  plan: Exclude<PlanTier, "Free"> | null;
  endsAt?: string | null;
  note?: string | null;
};

/** Lobby size before plans existed, and Free's today — the fallback while the plan is loading. */
export const FREE_LOBBY_PLAYERS = 10;
export const MIN_LOBBY_PLAYERS = 2;

/** The public catalogue: what the pricing page renders. Changes only on deploy. */
export const usePlanCatalog = () =>
  useQuery({
    queryKey: planKeys.catalog(),
    queryFn: () => apiService.get<PlanCatalog>("/plans"),
    staleTime: 60 * 60 * 1000,
  });

/**
 * The signed-in user's plan and limits. Pass `enabled: false` for signed-out callers — the
 * endpoint is authenticated, and a 401 here would trigger a pointless refresh attempt.
 */
export const useMyPlan = (enabled = true) =>
  useQuery({
    queryKey: planKeys.mine(),
    queryFn: () => apiService.get<MyPlan>("/plans/me"),
    enabled,
    staleTime: 60 * 1000,
  });

/** Admin: one user's plan and manual grant. */
export const useUserPlan = (userId: string | null) =>
  useQuery({
    queryKey: planKeys.user(userId ?? ""),
    queryFn: () => apiService.get<UserPlanAdmin>(`/plans/users/${userId}`),
    enabled: !!userId,
  });

/** Admin: grant, change or revoke a manual plan. Granting Teacher also grants the role server-side. */
export const useSetManualPlan = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetManualPlanInput) =>
      apiService.put<UserPlanAdmin>(`/plans/users/${userId}/manual`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.all }),
  });
};

/**
 * The cheapest plan that raises one limit above where the user is, or null at the top. Mirrors
 * PlanCatalog.CheapestAbove on the server, which names the same plan in a PlanLimitReached 403.
 */
export const cheapestUpgrade = (
  catalog: PlanCatalog | undefined,
  current: PlanTier,
  pick: (limits: PlanLimits) => number | null,
): Plan | null => {
  if (!catalog) return null;
  const mine = catalog.plans.find((p) => p.tier === current);
  const have = mine ? pick(mine.limits) : null;
  if (have === null) return null; // already unlimited
  return (
    catalog.plans.find((p) => {
      if (p.tier === "Free") return false;
      const value = pick(p.limits);
      return value === null || value > have;
    }) ?? null
  );
};
