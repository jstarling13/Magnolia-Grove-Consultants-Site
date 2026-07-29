"use client";

import { useEffect, useState } from "react";
import type { ClientProfile } from "@/lib/clientUsers";

/**
 * Returns the logged-in client's saved profile, or null if signed out.
 * Used to autofill public forms so returning clients don't retype the
 * same info every visit — entirely silent/optional, forms work the same
 * either way.
 */
export function useClientProfile(): ClientProfile | null {
  const [profile, setProfile] = useState<ClientProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/me")
      .then((res) => (res.ok ? res.json() : { profile: null }))
      .then((data) => {
        if (!cancelled) setProfile(data.profile ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
