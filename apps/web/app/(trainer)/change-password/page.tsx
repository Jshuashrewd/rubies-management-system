"use client";

import { ApiError } from "@rubies/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { controlClasses, Field } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ChangePasswordPage() {
  const { user, isLoading, refresh } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Not signed in → nothing to change a password for.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.changePassword({ currentPassword: current, newPassword: next });
      await refresh();
      router.replace("/report");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas-tint p-lg">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-border bg-canvas p-lg">
        <h1 className="font-display text-headline-md font-bold text-text-primary">
          Set a new password
        </h1>
        <p className="mt-2xs font-body text-body-md leading-relaxed text-text-secondary">
          For your security, replace the default password before continuing.
        </p>

        <div className="mt-lg flex flex-col gap-md">
          <Field label="Current password" htmlFor="current">
            <input
              id="current"
              type="password"
              autoComplete="current-password"
              placeholder="Your surname (default)"
              className={controlClasses}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </Field>

          <Field label="New password" htmlFor="next">
            <input
              id="next"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={controlClasses}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </Field>

          <Field label="Confirm new password" htmlFor="confirm">
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              className={controlClasses}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
        </div>

        {error ? (
          <p role="alert" className="mt-md font-body text-body-sm text-error">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="accent" loading={loading} className="mt-lg w-full">
          Save password
        </Button>
      </form>
    </div>
  );
}
