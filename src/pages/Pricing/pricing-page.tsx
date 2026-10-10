import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { useMyPlan, usePlanCatalog, type Plan, type PlanTier } from "@/lib/api/plans";
import { useCheckout } from "@/lib/api/billing";
import { PricingPageView, type BillingPeriod } from "./pricing-page-view";
import type { Paddle, PricePreviewParams } from "@paddle/paddle-js";

/** Paddle's already-localized total for one price, keyed by price id. The only field this page reads off a preview. */
export type PricePreviewMap = Record<string, string>;

const allPriceIds = (plans: Plan[]): string[] =>
  plans.flatMap((p) => [p.monthlyPriceId, p.yearlyPriceId]).filter((id): id is string => !!id);

/** `/pricing` — public. The plans and their limits, from `GET /api/plans` (docs/auth/paid-plans.md). */
export const PricingPage = () => {
  const navigate = useNavigate();
  const user = useUser();
  const signedIn = !!user.data;
  const catalog = usePlanCatalog();
  const myPlan = useMyPlan(signedIn);
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const checkout = useCheckout();
  // State, not a ref: setting a ref doesn't trigger the PricePreview effect below once Paddle.js
  // finishes initialising asynchronously — state is what makes "Paddle just became ready" a
  // dependency a second effect can actually react to.
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [preview, setPreview] = useState<PricePreviewMap>({});

  // Paddle.js is a library, not a route — loaded with a plain dynamic import inside this effect
  // rather than the route-level `lazy()` convention in src/routes/Router.tsx. Gated on a real
  // clientToken so a Fake-provider dev/CI box never calls out to Paddle's CDN at all.
  useEffect(() => {
    if (!catalog.data?.checkoutAvailable || !catalog.data.clientToken) return;
    const { environment, clientToken } = catalog.data;
    let cancelled = false;

    import("@paddle/paddle-js").then(({ initializePaddle }) =>
      initializePaddle({ environment, token: clientToken }).then((instance) => {
        if (!cancelled) setPaddle(instance);
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [catalog.data?.checkoutAvailable, catalog.data?.clientToken, catalog.data?.environment]);

  // Country-localized prices (docs/proposals/paid-plans-and-payments.md doesn't cover this — it's
  // this session's follow-up ask). One batched PricePreview for every price id on the page, not
  // one call per card. `countryCode` is only ever a real ISO code or null (never a sentinel) —
  // when null, `address` is omitted entirely so Paddle auto-detects from the visitor's IP itself.
  useEffect(() => {
    if (!paddle || !catalog.data) return;
    const items = allPriceIds(catalog.data.plans).map((priceId) => ({ priceId, quantity: 1 }));
    if (items.length === 0) return;

    const params: PricePreviewParams = catalog.data.countryCode
      ? { items, address: { countryCode: catalog.data.countryCode } }
      : { items };

    paddle.PricePreview(params).then((response) => {
      const next: PricePreviewMap = {};
      for (const lineItem of response.data.details.lineItems)
        next[lineItem.price.id] = lineItem.formattedTotals.total;
      setPreview(next);
    });
  }, [paddle, catalog.data]);

  const onBuy = (plan: Exclude<PlanTier, "Free">) => {
    checkout.mutate(
      { plan, interval: period === "yearly" ? "Year" : "Month" },
      {
        onSuccess: ({ transactionId }) => {
          if (paddle) {
            paddle.Checkout.open({
              transactionId,
              settings: {
                displayMode: "overlay",
                variant: "one-page",
                successUrl: `${window.location.origin}/welcome?plan=${plan}`,
              },
            });
          } else {
            // Fake provider: no overlay to redirect from. BillingController.Checkout already
            // upserted the subscription synchronously before this resolved, so there's nothing
            // left to wait for — go straight to the same landing a real purchase redirects to.
            navigate(`/welcome?plan=${plan}`);
          }
        },
      },
    );
  };

  return (
    <PricingPageView
      catalog={catalog.data}
      isLoading={catalog.isLoading}
      currentPlan={signedIn ? myPlan.data?.plan ?? null : null}
      period={period}
      onPeriodChange={setPeriod}
      onSignUp={() => navigate("/signup")}
      onBuy={onBuy}
      buyingPlan={checkout.isPending ? (checkout.variables?.plan ?? null) : null}
      preview={preview}
    />
  );
};
