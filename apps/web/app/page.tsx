"use client";

// Entry route: send the signed-in user where they belong based on role.
// Mirrors apps/mobile/src/app/index.tsx (student side). This app now
// serves two roles — trainer (report console) and admin (admin console).
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.mustChangePassword) {
      router.replace("/change-password");
    } else if (user.role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/report");
    }
  }, [isLoading, user, router]);

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
