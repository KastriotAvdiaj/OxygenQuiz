import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, Spinner } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import type { PlanTier } from "@/lib/api/plans";

type WelcomePageViewProps = {
  /** The plan the checkout was for, from the `?plan=` query param. Null for a direct, bare visit. */
  targetPlan: Exclude<PlanTier, "Free"> | null;
  /** True once there's nothing to wait for — no target plan, or the caller's plan already matches it. */
  confirmed: boolean;
  /** The wait gave up before confirming — the payment likely succeeded; the upgrade is just late. */
  timedOut: boolean;
};

/** `/welcome` — lands here after Paddle Checkout's `successUrl`, or the Fake provider's checkout. */
export const WelcomePageView = ({ targetPlan, confirmed, timedOut }: WelcomePageViewProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center text-foreground">
      <Card className="flex max-w-md flex-col items-center gap-4 border p-8 dark:border-foreground/30">
        {confirmed ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold">
              {targetPlan ? `You're on the ${targetPlan} plan` : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {targetPlan
                ? "Your account has been upgraded. Sign in again if you don't see the new limits yet."
                : "Glad to have you here."}
            </p>
            <LiftedButton outerClassName="w-full" className="w-full" onClick={() => navigate("/")}>
              Continue
            </LiftedButton>
          </>
        ) : timedOut ? (
          <>
            <h1 className="text-2xl font-bold">Almost there</h1>
            <p className="text-sm text-muted-foreground">
              Your payment went through — we're just waiting on confirmation from Paddle. We'll
              email you the moment your {targetPlan} plan is active, usually within a few minutes.
            </p>
            <LiftedButton outerClassName="w-full" className="w-full" onClick={() => navigate("/")}>
              Continue
            </LiftedButton>
          </>
        ) : (
          <>
            <Spinner size="lg" />
            <h1 className="text-2xl font-bold">Setting up your {targetPlan} plan</h1>
            <p className="text-sm text-muted-foreground">This only takes a moment.</p>
          </>
        )}
      </Card>
    </div>
  );
};
