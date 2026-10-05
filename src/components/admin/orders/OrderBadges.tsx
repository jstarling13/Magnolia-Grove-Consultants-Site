import type { AttentionFlag } from "@/lib/adminOrders";
import type { MerchOrderStatus } from "@/lib/merchOrders";

const STATUS_STYLES: Record<MerchOrderStatus, string> = {
  new: "border-onyx/30 bg-onyx text-cream",
  reviewing: "border-gold/40 bg-gold/10 text-onyx",
  quoted: "border-gold/40 bg-gold/10 text-onyx",
  awaiting_payment: "border-gold bg-gold/25 text-onyx",
  paid: "border-onyx/40 bg-cream-200 text-onyx",
  ordered_in_esp: "border-onyx/40 bg-cream-200 text-onyx",
  fulfilled: "border-onyx/20 bg-cream-100 text-onyx/70",
  cancelled: "border-onyx/15 bg-cream-100 text-onyx/50 line-through",
};

export function OrderStatusBadge({ status, label }: { status: MerchOrderStatus; label: string }) {
  return (
    <span
      data-status={status}
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}

/** Text-only call-outs (no icons) for what an order needs from the team right now. */
export function AttentionFlags({ flags }: { flags: AttentionFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <ul aria-label="Needs attention" className="flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <li
          key={flag.code}
          data-flag={flag.code}
          className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800"
        >
          {flag.label}
        </li>
      ))}
    </ul>
  );
}
