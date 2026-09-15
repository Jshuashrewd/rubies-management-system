"use client";

// Shared chrome for signed-in trainer routes. Mirrors the auth-gate role
// apps/mobile/src/app/index.tsx plays, plus the tab bar apps/mobile's
// (tabs)/_layout.tsx provides — collapsed to a top bar since there's one
// route (report) so far. Add nav links here as dashboard/students/
// curriculum land.
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { roleBadge } from "@rubies/shared";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [isLoading, user, router]);

  async function onSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (isLoading || !user || user.mustChangePassword) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas-tint">
        <span
          aria-hidden
          className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-primary"
        />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  const badge = roleBadge[user.role];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas-tint">
      <header className="flex items-center justify-between border-b border-border bg-canvas px-lg py-sm">
        <span className="font-display text-title-md font-semibold text-primary">
          Rubies Code School
        </span>

        <div className="flex items-center gap-sm">
          <span
            className="rounded-base px-xs py-1 font-body text-label-sm font-semibold capitalize"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {user.role}
          </span>
          <span className="font-body text-body-md text-text-primary">
            {user.firstName} {user.lastName}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="font-body text-body-sm font-semibold text-text-secondary hover:text-text-primary"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-lg py-lg">{children}</main>
    </div>
  );
}
