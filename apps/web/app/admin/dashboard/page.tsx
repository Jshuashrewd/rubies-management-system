"use client";

import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Radio, Users, CalendarClock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";

export default function AdminDashboardPage() {
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: () => api.admin.users.list() });
  const classesQuery = useQuery({ queryKey: ["schedule"], queryFn: () => api.schedule.list() });

  const users = usersQuery.data ?? [];
  const students = users.filter((u) => u.role === "student").length;
  const trainers = users.filter((u) => u.role === "trainer").length;

  const classes = classesQuery.data ?? [];
  const upcoming = classes
    .filter((c) => c.status === "scheduled" || c.status === "live")
    .sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-display text-headline-md font-bold text-text-primary">Dashboard</h1>
        <p className="mt-2xs font-body text-body-md text-text-secondary">
          A quick look at the school right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Students"
          value={students}
          loading={usersQuery.isLoading}
          href="/admin/users"
        />
        <StatCard
          icon={Users}
          label="Trainers"
          value={trainers}
          loading={usersQuery.isLoading}
          href="/admin/users"
        />
        <StatCard
          icon={CalendarClock}
          label="Scheduled classes"
          value={classes.filter((c) => c.status === "scheduled").length}
          loading={classesQuery.isLoading}
          href="/admin/classes"
        />
        <StatCard
          icon={Radio}
          label="Live now"
          value={classes.filter((c) => c.status === "live").length}
          loading={classesQuery.isLoading}
          href="/admin/classes"
        />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-title-lg font-semibold text-text-primary">
            Upcoming classes
          </h2>
          <Link href="/admin/classes" className="font-body text-body-sm font-semibold text-primary">
            View all
          </Link>
        </div>

        {classesQuery.isLoading ? (
          <p className="mt-md font-body text-body-md text-text-secondary">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="mt-md font-body text-body-md text-text-secondary">
            No classes scheduled yet. Head to Classes to schedule the first one.
          </p>
        ) : (
          <ul className="mt-md flex flex-col divide-y divide-border">
            {upcoming.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-sm">
                <div>
                  <p className="font-body text-body-md font-semibold text-text-primary">{c.title}</p>
                  <p className="font-body text-body-sm text-text-secondary">
                    {c.trainerName} ·{" "}
                    {c.students.map((student) => `${student.firstName} ${student.lastName}`).join(", ")}
                  </p>
                </div>
                <span className="font-mono text-label-sm text-text-secondary">
                  {formatDateTime(c.scheduledStartAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  loading: boolean;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary">
        <div className="flex items-center justify-between">
          <p className="font-body text-label-lg font-semibold text-text-secondary">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon size={16} />
          </span>
        </div>
        <p className="mt-2xs font-display text-headline-md font-bold text-text-primary">
          {loading ? "—" : value}
        </p>
      </Card>
    </Link>
  );
}
