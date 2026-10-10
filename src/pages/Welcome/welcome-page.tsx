import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { useMyPlan, type PlanTier } from "@/lib/api/plans";
import { WelcomePageView } from "./welcome-page-view";

/** How long to wait for the webhook/poll to confirm a purchase before saying "we'll email you". */
const CONFIRMATION_TIMEOUT_MS = 30_000;

/**
 * `/welcome?plan=Plus|Teacher` — where Paddle Checkout's `successUrl` (and the Fake provider's
 * checkout) land after a purchase. The entitlement upgrade itself is async — a real purchase
 * depends on Paddle's webhook reaching the API — so this page is the one place that wait lives,
 * moved here from `/pricing` so the pricing page itself stays a plain catalogue.
 */
export const WelcomePage = () => {
  const [params] = useSearchParams();
  const targetPlan = params.get("plan") as Exclude<PlanTier, "Free"> | null;
  const user = useUser();
  const signedIn = !!user.data;

  const [timedOut, setTimedOut] = useState(false);
  const myPlan = useMyPlan(signedIn, targetPlan && !timedOut ? 2000 : false);
  const confirmed = !targetPlan || myPlan.data?.plan === targetPlan;

  useEffect(() => {
    if (!targetPlan || confirmed) return;
    const timeout = setTimeout(() => setTimedOut(true), CONFIRMATION_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [targetPlan, confirmed]);

  return (
    <WelcomePageView
      targetPlan={targetPlan}
      confirmed={confirmed}
      timedOut={timedOut && !confirmed}
    />
  );
};
