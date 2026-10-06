"use client";

import {
  ApiError,
  type AdminCreateClassScheduleInput,
  type ClassStatus,
  type LevelWithTopics,
} from "@rubies/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClasses, Field } from "@/components/ui/Field";
import { formatDateTime } from "@/lib/format";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const STATUS_STYLES: Record<ClassStatus, string> = {
  scheduled: "bg-canvas-tint text-text-secondary",
  live: "bg-role-trainer-bg text-role-trainer-text",
  ended: "bg-border text-text-secondary",
  cancelled: "bg-error/10 text-error",
};

const EMPTY_FORM = {
  title: "",
  trainerUserId: "",
  studentUserIds: [] as string[],
  daysOfWeek: [] as number[],
  startTime: "16:00",
  durationMinutes: "60",
  startDate: "",
  endDate: "",
  topicId: "",
  zoomJoinUrl: "",
  paidThroughNote: "",
};

export default function AdminClassesPage() {
  const queryClient = useQueryClient();

  const classesQuery = useQuery({ queryKey: ["schedule"], queryFn: () => api.schedule.list() });
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: () => api.admin.users.list() });
  const levelsQuery = useQuery({ queryKey: ["admin", "levels"], queryFn: () => api.admin.levels.list() });

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const createSchedule = useMutation({
    mutationFn: (input: AdminCreateClassScheduleInput) => api.admin.classSchedules.create(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setForm(EMPTY_FORM);
      setError(null);
      setConfirmation(`Created "${result.title}" — ${result.sessionsCreated} session(s) scheduled.`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setConfirmation(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClassStatus }) =>
      api.admin.classSessions.updateStatus(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule"] }),
  });

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort(),
    }));
  }

  function toggleStudent(id: string) {
    setForm((f) => ({
      ...f,
      studentUserIds: f.studentUserIds.includes(id)
        ? f.studentUserIds.filter((s) => s !== id)
        : [...f.studentUserIds, id],
    }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmation(null);

    if (!form.trainerUserId) return setError("Choose a trainer.");
    if (form.studentUserIds.length === 0) return setError("Pick at least one student.");
    if (form.daysOfWeek.length === 0) return setError("Pick at least one day of the week.");
    if (!form.startDate || !form.endDate) return setError("Start and end date are required.");
    if (form.endDate < form.startDate) return setError("End date must be on or after start date.");
    if (!form.zoomJoinUrl.trim()) return setError("Zoom link is required.");

    const durationMinutes = Number(form.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15) {
      return setError("Duration must be at least 15 minutes.");
    }

    createSchedule.mutate({
      title: form.title.trim(),
      trainerUserId: form.trainerUserId,
      studentUserIds: form.studentUserIds,
      daysOfWeek: form.daysOfWeek,
      startTime: form.startTime,
      durationMinutes,
      startDate: form.startDate,
      endDate: form.endDate,
      topicId: form.topicId || undefined,
      zoomJoinUrl: form.zoomJoinUrl.trim(),
      paidThroughNote: form.paidThroughNote.trim() || undefined,
    });
  }

  const trainers = (usersQuery.data ?? []).filter((u) => u.role === "trainer");
  const students = (usersQuery.data ?? []).filter((u) => u.role === "student");
  const topicOptions = (levelsQuery.data ?? []).flatMap((level: LevelWithTopics) =>
    level.topics.map((topic) => ({ id: topic.id, label: `${level.stage} L${level.order}: ${topic.title}` })),
  );
  const sessions = [...(classesQuery.data ?? [])].sort((a, b) =>
    b.scheduledStartAt.localeCompare(a.scheduledStartAt),
  );

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-display text-headline-md font-bold text-text-primary">Classes</h1>
        <p className="mt-2xs font-body text-body-md text-text-secondary">
          Book a recurring schedule — pick the days, a time, and a date range (a single day
          works too). Every matching session is created immediately, up to 60 at a time.
        </p>
      </div>

      <Card>
        <h2 className="font-display text-title-lg font-semibold text-text-primary">
          Schedule classes
        </h2>

        {trainers.length === 0 && !usersQuery.isLoading ? (
          <p className="mt-sm font-body text-body-sm text-text-secondary">
            No trainers yet — add one on the Users page first.
          </p>
        ) : null}
        {students.length === 0 && !usersQuery.isLoading ? (
          <p className="mt-sm font-body text-body-sm text-text-secondary">
            No students yet — add one on the Users page first.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-md flex flex-col gap-md">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Field label="Title" htmlFor="title" hint="e.g. Chinedu — Scratch Basics">
              <input
                id="title"
                className={controlClasses}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>

            <Field label="Trainer" htmlFor="trainerUserId">
              <select
                id="trainerUserId"
                className={controlClasses}
                value={form.trainerUserId}
                onChange={(e) => setForm({ ...form, trainerUserId: e.target.value })}
                required
              >
                <option value="">Select a trainer…</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.schoolId})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Students" htmlFor="students-0" hint="One for 1-on-1, several for a group class">
            <div className="flex flex-wrap gap-xs">
              {students.map((s, i) => {
                const checked = form.studentUserIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    htmlFor={`students-${i}`}
                    className={[
                      "cursor-pointer rounded-base border px-sm py-2xs font-body text-body-sm font-semibold transition-colors",
                      checked
                        ? "border-primary bg-primary text-white"
                        : "border-border-strong bg-canvas text-text-primary hover:bg-canvas-tint",
                    ].join(" ")}
                  >
                    <input
                      id={`students-${i}`}
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleStudent(s.id)}
                    />
                    {s.firstName} {s.lastName}
                  </label>
                );
              })}
            </div>
          </Field>

          <Field label="Days of the week" htmlFor="day-0">
            <div className="flex flex-wrap gap-xs">
              {DAYS.map((d) => {
                const checked = form.daysOfWeek.includes(d.value);
                return (
                  <label
                    key={d.value}
                    htmlFor={`day-${d.value}`}
                    className={[
                      "cursor-pointer rounded-base border px-sm py-2xs font-body text-body-sm font-semibold transition-colors",
                      checked
                        ? "border-accent bg-accent text-white"
                        : "border-border-strong bg-canvas text-text-primary hover:bg-canvas-tint",
                    ].join(" ")}
                  >
                    <input
                      id={`day-${d.value}`}
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleDay(d.value)}
                    />
                    {d.label}
                  </label>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Field label="Start time" htmlFor="startTime" hint="School's local time">
              <input
                id="startTime"
                type="time"
                className={controlClasses}
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </Field>

            <Field label="Duration (minutes)" htmlFor="durationMinutes" hint="e.g. 60 or 120">
              <input
                id="durationMinutes"
                type="number"
                min={15}
                step={15}
                className={controlClasses}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                required
              />
            </Field>

            <Field label="Start date" htmlFor="startDate">
              <input
                id="startDate"
                type="date"
                className={controlClasses}
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </Field>

            <Field label="End date" htmlFor="endDate" hint="Same as start date for a single class">
              <input
                id="endDate"
                type="date"
                className={controlClasses}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Topic" htmlFor="topicId" hint="Optional">
              <select
                id="topicId"
                className={controlClasses}
                value={form.topicId}
                onChange={(e) => setForm({ ...form, topicId: e.target.value })}
              >
                <option value="">None</option>
                {topicOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Zoom link" htmlFor="zoomJoinUrl">
              <input
                id="zoomJoinUrl"
                type="url"
                placeholder="https://zoom.us/j/…"
                className={controlClasses}
                value={form.zoomJoinUrl}
                onChange={(e) => setForm({ ...form, zoomJoinUrl: e.target.value })}
                required
              />
            </Field>
          </div>

          <Field
            label="Payment note"
            htmlFor="paidThroughNote"
            hint={'Optional — informational only, e.g. "Paid through 30 Oct"'}
          >
            <input
              id="paidThroughNote"
              className={controlClasses}
              value={form.paidThroughNote}
              onChange={(e) => setForm({ ...form, paidThroughNote: e.target.value })}
            />
          </Field>

          {error ? (
            <p role="alert" className="font-body text-body-sm text-error">
              {error}
            </p>
          ) : null}
          {confirmation ? (
            <p role="status" className="font-body text-body-sm text-success">
              {confirmation}
            </p>
          ) : null}

          <Button type="submit" variant="accent" loading={createSchedule.isPending} className="self-start">
            Schedule classes
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-title-lg font-semibold text-text-primary">All sessions</h2>

        {classesQuery.isLoading ? (
          <p className="mt-md font-body text-body-md text-text-secondary">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="mt-md font-body text-body-md text-text-secondary">
            No classes scheduled yet.
          </p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">Class</th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">Trainer</th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">Students</th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">When</th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">Status</th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-sm font-body text-body-md font-semibold text-text-primary">
                      {c.title}
                    </td>
                    <td className="py-sm font-body text-body-sm text-text-secondary">{c.trainerName}</td>
                    <td className="py-sm font-body text-body-sm text-text-secondary">
                      {c.students.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}
                    </td>
                    <td className="py-sm font-mono text-label-sm text-text-secondary">
                      {formatDateTime(c.scheduledStartAt)}
                    </td>
                    <td className="py-sm">
                      <span
                        className={[
                          "rounded-base px-xs py-1 font-body text-label-sm font-semibold capitalize",
                          STATUS_STYLES[c.status],
                        ].join(" ")}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-sm text-right">
                      {c.status === "scheduled" || c.status === "live" ? (
                        <button
                          type="button"
                          onClick={() => updateStatus.mutate({ id: c.id, status: "cancelled" })}
                          disabled={updateStatus.isPending}
                          className="font-body text-body-sm font-semibold text-error hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
