"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";

function destinationForRole(role: string | undefined): string {
  switch (role) {
    case "ADMIN":
    case "MANAGER":
      return "/admin";
    case "KITCHEN":
      return "/kitchen";
    case "BAR":
      return "/bar";
    case "WAITRESS":
      return "/waitress";
    case "CASHIER":
      return "/cashier";
    default:
      return "/";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const forbidden = searchParams.get("error") === "forbidden";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await signIn("credentials", {
      email: identifier,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (res?.error) {
      setError("Incorrect login details. Please try again.");
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role as string | undefined;

    const destination = callbackUrl ?? destinationForRole(role);
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bn-charcoal px-5">
      <div className="w-full max-w-sm border border-bn-gold/20 bg-bn-cream p-8">
        <div className="flex justify-center">
          <Image src="/brand/be-nice-logo.png" alt="Be-Nice" width={64} height={64} className="rounded-full" />
        </div>
        <h1 className="mt-4 text-center font-display text-xl font-semibold text-bn-charcoal">Staff Login</h1>
        <p className="mt-1 text-center text-xs text-bn-charcoal-soft">Coratech Restaurant OS</p>

        {forbidden && (
          <p className="mt-4 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            You don&apos;t have access to that dashboard.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or phone"
            className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2.5 text-sm outline-none"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2.5 text-sm outline-none"
            autoComplete="current-password"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-bn-red py-2.5 text-sm font-semibold text-bn-cream transition hover:bg-bn-red-dark disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
