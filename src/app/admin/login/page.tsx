"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gold/25 bg-onyx-100 p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
          <Lock size={20} />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-white">Admin Login</h1>
        <p className="mt-2 text-sm text-muted">Magnolia Grove Consultants</p>

        <label htmlFor="username" className="mt-6 block text-sm font-medium text-muted-light">
          Username
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-2 w-full rounded-md border border-gold/25 bg-onyx px-4 py-3 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/60"
        />

        <label htmlFor="password" className="mt-4 block text-sm font-medium text-muted-light">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-gold/25 bg-onyx px-4 py-3 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/60"
        />

        {error && (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !username || !password}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-semibold text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : "Log In"}
        </button>
      </form>
    </div>
  );
}
