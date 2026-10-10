import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyPlan } from "@/lib/api/plans";
import { usePortal } from "@/lib/api/billing";

/**
 * "Manage subscription" in the account panel (docs/proposals/paid-plans-and-payments.md §5.5).
 * Only for a plan actually bought through Paddle — a manual grant or the Fake provider has no
 * real portal session to open, so this renders nothing for either (<see>MyPlanDTO.Provider</see>
 * is exactly the field that lets the client tell them apart).
 */
export const SubscriptionSection = () => {
  const mine = useMyPlan();
  const portal = usePortal();

  if (!mine.data || mine.data.provider !== "Paddle") return null;

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-start gap-3">
        <CreditCard aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm font-semibold">Subscription</h3>
          <p className="text-sm text-muted-foreground">
            Cancel, change your card, or download invoices at Paddle, who process the payment.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={portal.isPending}
            onClick={() =>
              portal.mutate(undefined, {
                onSuccess: ({ url }) => {
                  window.location.href = url;
                },
              })
            }
          >
            Manage subscription
          </Button>
        </div>
      </div>
    </section>
  );
};
