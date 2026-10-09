import { Sparkles } from "lucide-react";
import { useMyPlan } from "@/lib/api/plans";

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

/**
 * "Plan" in the account panel (docs/auth/paid-plans.md): which plan you're on, what it gives
 * you, and when it ends. Managing a bought plan (cancel, card, invoices) will link out to the
 * payment provider's portal once checkout exists; until then this links to /pricing.
 */
export const PlanSection = () => {
  const mine = useMyPlan();
  if (!mine.data) return null;
  const { plan, isStaff, limits, planEndsAt, cancelAtPeriodEnd } = mine.data;

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-start gap-3">
        <Sparkles aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm font-semibold">Plan: {plan}</h3>
          <p className="text-sm text-muted-foreground">
            {isStaff
              ? "Staff account — plan limits don't apply to you."
              : [
                  limits.aiDailyGenerations === null
                    ? "No daily AI limit"
                    : `${limits.aiDailyGenerations} AI ${limits.aiDailyGenerations === 1 ? "quiz" : "quizzes"} a day`,
                  `lobbies of up to ${limits.maxLobbyPlayers}`,
                  limits.maxClasses === null
                    ? "unlimited classes"
                    : `${limits.maxClasses} ${limits.maxClasses === 1 ? "class" : "classes"}`,
                ].join(" · ")}
          </p>
          {planEndsAt && (
            <p className="text-sm text-muted-foreground">
              {cancelAtPeriodEnd ? "Ends" : "Renews"} on {formatDay(planEndsAt)}.
            </p>
          )}
          <a href="/pricing" className="inline-block text-sm text-primary underline-offset-2 hover:underline">
            {plan === "Teacher" ? "Compare plans" : "See plans"}
          </a>
        </div>
      </div>
    </section>
  );
};
