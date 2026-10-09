import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { useMyPlan, usePlanCatalog } from "@/lib/api/plans";
import { PricingPageView, type BillingPeriod } from "./pricing-page-view";

/** `/pricing` — public. The plans and their limits, from `GET /api/plans` (docs/auth/paid-plans.md). */
export const PricingPage = () => {
  const navigate = useNavigate();
  const user = useUser();
  const signedIn = !!user.data;
  const catalog = usePlanCatalog();
  const myPlan = useMyPlan(signedIn);
  const [period, setPeriod] = useState<BillingPeriod>("yearly");

  return (
    <PricingPageView
      catalog={catalog.data}
      isLoading={catalog.isLoading}
      currentPlan={signedIn ? myPlan.data?.plan ?? null : null}
      period={period}
      onPeriodChange={setPeriod}
      onSignUp={() => navigate("/signup")}
    />
  );
};
