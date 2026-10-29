"use client";

import Link from "next/link";
import { saveVertical, type Vertical } from "@/lib/verticalChoice";

const TARGET: Record<Vertical, { href: string; label: string }> = {
  business: { href: "/business", label: "For Businesses" },
  political: { href: "/", label: "For Campaigns" },
};

// Lets a visitor move to the other side of the site at any time. It also
// records the choice, so the home page sends them to the side they picked.
export default function VerticalSwitch({
  to,
  className = "",
  onNavigate,
}: {
  to: Vertical;
  className?: string;
  onNavigate?: () => void;
}) {
  const { href, label } = TARGET[to];
  return (
    <Link
      href={href}
      onClick={() => {
        saveVertical(to);
        onNavigate?.();
      }}
      className={className}
    >
      {label} →
    </Link>
  );
}
