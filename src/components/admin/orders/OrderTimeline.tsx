import { formatOrderDate, type TimelineStep } from "@/lib/adminOrders";

/** Plain dot-and-line timeline; steps with no stored time show as pending. */
export default function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol aria-label="Order timeline" className="space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li
            key={step.key}
            data-step={step.key}
            data-done={step.done ? "true" : "false"}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            {!last && (
              <span
                aria-hidden="true"
                className="absolute left-[5px] top-4 h-[calc(100%-1rem)] w-px bg-gold/30"
              />
            )}
            <span
              aria-hidden="true"
              className={`mt-1 h-[11px] w-[11px] shrink-0 rounded-full border ${
                step.done ? "border-onyx bg-onyx" : "border-onyx/30 bg-cream"
              }`}
            />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${step.done ? "text-onyx" : "text-onyx/50"}`}>
                {step.label}
              </p>
              <p className="text-xs text-onyx/60">
                {step.done ? (step.at ? formatOrderDate(step.at) : "Date not recorded") : "Pending"}
                {step.detail ? ` · ${step.detail}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
