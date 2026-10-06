"use client";

// Shared chrome for signed-in admin routes. Mirrors the structure of
// apps/web/app/(trainer)/(app)/layout.tsx — same header/guard shape, with
// admin-specific nav links and a stricter role check (kicks non-admins
// back out to the trainer console rather than just to /login).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { roleBadge } from "@rubies/shared";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/curriculum", label: "Curriculum" },
  { href: "/admin/classes", label: "Classes" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.mustChangePassword) {
      router.replace("/change-password");
    } else if (user.role !== "admin") {
      // A trainer/student token somehow reaching /admin/* — send them back
      // to their own console rather than showing (or erroring on) admin data.
      router.replace("/report");
    }
  }, [isLoading, user, router]);

  async function onSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (isLoading || !user || user.mustChangePassword || user.role !== "admin") {
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
      <header className="flex items-center justify-between border-b border-border bg-canvas px-lg py-sm shadow-sm">
        <div className="flex items-center gap-xl">
          <Logo size="sm" />
          <nav className="flex items-center gap-md">
            {NAV_LINKS.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "rounded-base px-xs py-2xs font-body text-body-md font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-canvas-tint hover:text-text-primary",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

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
