"use client";

import { useEffect } from "react";
import { trackMerchPurchaseWhenReady } from "@/lib/merchAnalytics";

/** Renders nothing. Reports the merchandise payment to GA4 once per tab session. */
export default function MerchPurchaseTracker() {
  useEffect(() => trackMerchPurchaseWhenReady(), []);
  return null;
}
