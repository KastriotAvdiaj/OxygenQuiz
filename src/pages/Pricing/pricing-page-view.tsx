import { Check } from "lucide-react";
import { Card, Spinner } from "@/components/ui";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LiftedButton } from "@/common/LiftedButton";
import type { Plan, PlanCatalog, PlanLimits, PlanTier } from "@/lib/api/plans";

export type BillingPeriod = "yearly" | "monthly";

type PricingPageViewProps = {
  catalog: PlanCatalog | undefined;
  isLoading: boolean;
  /** The signed-in user's plan, or null when signed out. */
  currentPlan: PlanTier | null;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
  onSignUp: () => void;
};

const euro = (amount: number) =>
  `€${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

/** One line per limit, in the order a buyer compares them. Copy, not logic: the numbers are the API's. */
const limitLines = (limits: PlanLimits, tier: PlanTier): string[] => {
  const lines: string[] = [];
  lines.push(
    limits.aiDailyGenerations === null
      ? "Unlimited AI quizzes"
      : `${limits.aiDailyGenerations} AI ${limits.aiDailyGenerations === 1 ? "quiz" : "quizzes"} a day`,
  );
  lines.push(
    limits.maxOwnedQuizzes === null ? "Unlimited quizzes you create" : `Up to ${limits.maxOwnedQuizzes} quizzes`,
  );
  lines.push(`Lobbies of up to ${limits.maxLobbyPlayers} players`);
  if (tier === "Teacher") {
    lines.push("Host boards for your class");
    lines.push(limits.maxClasses === null ? "Unlimited classes" : `${limits.maxClasses} classes`);
  } else {
    lines.push("Solo play and live multiplayer");
  }
  return lines;
};

/**
 * The pricing page's markup (docs/auth/paid-plans.md). Container: `PricingPage`.
 *
 * Checkout doesn't exist yet, so a paid plan's button says "Coming soon" until the API reports
 * `checkoutAvailable`. Prices are display prices in EUR from the API's PlanCatalog.
 */
export const PricingPageView = ({
  catalog,
  isLoading,
  currentPlan,
  period,
  onPeriodChange,
  onSignUp,
}: PricingPageViewProps) => (
  <div className="flex flex-1 flex-col items-center px-4 py-10 text-foreground">
    <div className="w-full max-w-5xl">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Plans</h1>
        <SegmentedControl<BillingPeriod>
          aria-label="Billing period"
          value={period}
          onValueChange={onPeriodChange}
          options={[
            { value: "yearly", label: "Yearly — save about 40%" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
      </div>

      {isLoading || !catalog ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {catalog.plans.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              period={period}
              isCurrent={currentPlan === plan.tier}
              signedIn={currentPlan !== null}
              checkoutAvailable={catalog.checkoutAvailable}
              onSignUp={onSignUp}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Prices in euros, including VAT where it applies. Cancel any time — you keep your plan to the
        end of the period you paid for, and nothing you made is ever deleted.
      </p>
    </div>
  </div>
);

const PlanCard = ({
  plan,
  period,
  isCurrent,
  signedIn,
  checkoutAvailable,
  onSignUp,
}: {
  plan: Plan;
  period: BillingPeriod;
  isCurrent: boolean;
  signedIn: boolean;
  checkoutAvailable: boolean;
  onSignUp: () => void;
}) => {
  const free = plan.tier === "Free";
  const price = period === "yearly" ? plan.yearlyEur : plan.monthlyEur;

  return (
    <Card
      className={`flex flex-col gap-5 p-6 ${
        plan.tier === "Teacher" ? "border-2 border-primary" : "border dark:border-foreground/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{plan.name}</h2>
        {isCurrent && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Your plan
          </span>
        )}
      </div>

      <p className="flex items-baseline gap-1">
        <span className="text-4xl font-bold">{free ? "€0" : euro(price)}</span>
        {!free && (
          <span className="text-sm text-muted-foreground">/ {period === "yearly" ? "year" : "month"}</span>
        )}
      </p>

      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {limitLines(plan.limits, plan.tier).map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {line}
          </li>
        ))}
      </ul>

      {free ? (
        signedIn ? null : (
          <LiftedButton
            onClick={onSignUp}
            outerClassName="w-full"
            className="w-full bg-background border border-foreground/30 text-foreground"
            liftColor="muted"
          >
            Sign up free
          </LiftedButton>
        )
      ) : isCurrent ? null : (
        <LiftedButton outerClassName="w-full" className="w-full" disabled={!checkoutAvailable}>
          {checkoutAvailable ? `Get ${plan.name}` : "Coming soon"}
        </LiftedButton>
      )}
    </Card>
  );
};
