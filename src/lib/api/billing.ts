import { useMutation } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import type { PlanTier } from "@/lib/api/plans";

/** Paddle checkout and portal (docs/proposals/paid-plans-and-payments.md §5.4, §5.5). */

export type CheckoutInput = {
  plan: Exclude<PlanTier, "Free">;
  interval: "Month" | "Year";
};

export type CheckoutResponse = {
  transactionId: string;
};

export type PortalResponse = {
  url: string;
};

/** Opens a Paddle transaction server-side and returns its id for `Paddle.Checkout.open`. */
export const useCheckout = () =>
  useMutation({
    mutationFn: (input: CheckoutInput) =>
      apiService.post<CheckoutResponse>("/billing/checkout", input),
  });

/** A Paddle-hosted session URL to manage the caller's subscription. */
export const usePortal = () =>
  useMutation({
    mutationFn: () => apiService.post<PortalResponse>("/billing/portal"),
  });
