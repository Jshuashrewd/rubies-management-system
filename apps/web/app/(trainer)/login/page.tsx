"use client";

import { ApiError } from "@rubies/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { controlClasses, Field } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await signIn(schoolId.trim(), password);
      router.replace(user.mustChangePassword ? "/change-password" : "/report");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Brand panel — hidden on small screens to keep the form the focus there. */}
      <div className="hidden flex-col justify-between bg-primary p-2xl text-white md:flex md:w-2/5">
        <span className="font-display text-title-lg font-semibold tracking-tight">
          Rubies Code School
        </span>
        <div className="max-w-xs">
          <p className="font-display text-headline-lg font-semibold leading-tight">
            Trainer console
          </p>
          <p className="mt-sm font-body text-body-lg text-white/70">
            Your schedule, your students&apos; progress, and post-class reports —
            in one place.
          </p>
        </div>
        <span className="font-mono text-label-sm text-white/40">RCS-TRN</span>
      </div>

      <div className="flex flex-1 items-center justify-center p-lg">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="mb-xl md:hidden">
            <span className="font-display text-title-lg font-semibold text-primary">
              Rubies Code School
            </span>
          </div>

          <h1 className="font-display text-headline-md font-bold text-text-primary">
            Sign in
          </h1>
          <p className="mt-2xs font-body text-body-md text-text-secondary">
            Use your School ID and password.
          </p>

          <div className="mt-lg flex flex-col gap-md">
            <Field label="School ID" htmlFor="schoolId">
              <input
                id="schoolId"
                name="schoolId"
                type="text"
                autoComplete="username"
                autoCapitalize="characters"
                autoCorrect="off"
                placeholder="RCS-TRN-2025-014"
                className={controlClasses}
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                required
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your surname (first login)"
                className={controlClasses}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            Sign in
          </Button>

          <p className="mt-md font-body text-body-sm leading-relaxed text-text-secondary">
            First time? Your password is your lowercase surname. You&apos;ll set a
            new one right after signing in. Lost access? Ask an admin to reset
            your password — there&apos;s no self-service reset.
          </p>
        </form>
      </div>
    </div>
  );
}
