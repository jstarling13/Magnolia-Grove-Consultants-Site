import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_MEASUREMENT_ID } from "@/lib/gtag";

/** Renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset, matching the
 * graceful-degradation pattern used by every other optional integration. */
export default function Analytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
