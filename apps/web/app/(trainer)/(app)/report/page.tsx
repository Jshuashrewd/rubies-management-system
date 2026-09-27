"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  type AttendanceStatus,
  type CreateReportInput,
} from "@rubies/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClasses, Field } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { formatDay, formatTime } from "@/lib/format";

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
];

const PARTICIPATION_SCALE = [1, 2, 3, 4, 5] as const;

const EMPTY_FORM = {
  classId: "",
  studentId: "",
  attendance: "" as AttendanceStatus | "",
  participation: null as number | null,
  curriculumStageId: "",
  stageCompleted: false,
  topicsCovered: "",
  strengths: "",
  areasToImprove: "",
  homework: "",
  trainerComments: "",
};

export default function ReportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
  });
  const studentsQuery = useQuery({
    queryKey: ["trainer-students"],
    queryFn: () => api.students.assigned(),
  });
  const stagesQuery = useQuery({
    queryKey: ["curriculum-stages"],
    queryFn: () => api.curriculum.stages(),
  });

  const selectedStudent = useMemo(
    () => studentsQuery.data?.find((s) => s.id === form.studentId) ?? null,
    [studentsQuery.data, form.studentId],
  );

  const createReport = useMutation({
    mutationFn: (input: CreateReportInput) => api.reports.create(input),
    onSuccess: (_report, input) => {
      const guardian = studentsQuery.data?.find((s) => s.id === input.studentId)
        ?.guardianEmail;
      setConfirmation(
        guardian
          ? `Report sent — ${guardian} will get an email shortly.`
          : "Report sent.",
      );
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["curriculum-progress"] });
    },
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirmation(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmation(null);

    if (!form.classId || !form.studentId || !form.attendance || !form.curriculumStageId) {
      setError("Fill in class, student, attendance, and curriculum stage.");
      return;
    }
    if (!form.participation) {
      setError("Rate participation from 1 to 5.");
      return;
    }
    if (!form.topicsCovered.trim() || !form.strengths.trim() || !form.areasToImprove.trim() || !form.trainerComments.trim()) {
      setError("Topics covered, strengths, areas to improve, and comments are all required.");
      return;
    }

    const input: CreateReportInput = {
      classId: form.classId,
      studentId: form.studentId,
      attendance: form.attendance,
      participation: form.participation,
      curriculumStageId: form.curriculumStageId,
      stageCompleted: form.stageCompleted,
      topicsCovered: form.topicsCovered.trim(),
      strengths: form.strengths.trim(),
      areasToImprove: form.areasToImprove.trim(),
      trainerComments: form.trainerComments.trim(),
      ...(form.homework.trim() ? { homework: form.homework.trim() } : {}),
    };

    try {
      await createReport.mutateAsync(input);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the report. Try again.");
    }
  }

  const loadError = classesQuery.isError || studentsQuery.isError || stagesQuery.isError;

  return (
    <div className="mx-auto max-w-[42rem]">
      <h1 className="font-display text-headline-md font-bold text-text-primary">
        Post-class report
      </h1>
      <p className="mt-2xs font-body text-body-md text-text-secondary">
        Submitting sends this straight to the student&apos;s guardian and, if
        the stage is complete, advances their curriculum.
      </p>

      {loadError ? (
        <Card className="mt-lg border-error/40 bg-error/5">
          <p className="font-body text-body-md text-error">
            Couldn&apos;t load classes, students, or curriculum stages. Check that
            the API is running, then refresh.
          </p>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="mt-lg flex flex-col gap-lg">
          <Card className="flex flex-col gap-md">
            <div className="grid gap-md sm:grid-cols-2">
              <Field label="Class" htmlFor="classId">
                <select
                  id="classId"
                  className={controlClasses}
                  value={form.classId}
                  onChange={(e) => update("classId", e.target.value)}
                  disabled={classesQuery.isLoading}
                  required
                >
                  <option value="" disabled>
                    {classesQuery.isLoading ? "Loading…" : "Select a class"}
                  </option>
                  {classesQuery.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} — {formatDay(c.scheduledStartAt)} {formatTime(c.scheduledStartAt)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Student" htmlFor="studentId">
                <select
                  id="studentId"
                  className={controlClasses}
                  value={form.studentId}
                  onChange={(e) => update("studentId", e.target.value)}
                  disabled={studentsQuery.isLoading}
                  required
                >
                  <option value="" disabled>
                    {studentsQuery.isLoading ? "Loading…" : "Select a student"}
                  </option>
                  {studentsQuery.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} — {s.cohort}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card className="flex flex-col gap-md">
            <Field label="Attendance" htmlFor="attendance-present">
              <div className="flex gap-xs">
                {ATTENDANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    id={opt.value === "present" ? "attendance-present" : undefined}
                    type="button"
                    onClick={() => update("attendance", opt.value)}
                    aria-pressed={form.attendance === opt.value}
                    className={[
                      "flex-1 rounded-md border px-sm py-2.5 font-body text-body-md font-semibold transition-colors",
                      form.attendance === opt.value
                        ? "border-primary bg-primary text-white"
                        : "border-border-strong bg-canvas text-text-primary hover:bg-canvas-tint",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Participation" htmlFor="participation-1" hint="1 = disengaged, 5 = highly engaged">
              <div className="flex gap-xs">
                {PARTICIPATION_SCALE.map((n) => (
                  <button
                    key={n}
                    id={n === 1 ? "participation-1" : undefined}
                    type="button"
                    onClick={() => update("participation", n)}
                    aria-pressed={form.participation === n}
                    className={[
                      "h-11 flex-1 rounded-md border font-body text-title-md font-semibold transition-colors",
                      form.participation === n
                        ? "border-accent bg-accent text-white"
                        : "border-border-strong bg-canvas text-text-primary hover:bg-canvas-tint",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          <Card className="flex flex-col gap-md">
            <Field
              label="Curriculum stage covered"
              htmlFor="curriculumStageId"
              hint={selectedStudent ? `Current stage: ${selectedStudent.currentStageId ?? "—"}` : undefined}
            >
              <select
                id="curriculumStageId"
                className={controlClasses}
                value={form.curriculumStageId}
                onChange={(e) => update("curriculumStageId", e.target.value)}
                disabled={stagesQuery.isLoading}
                required
              >
                <option value="" disabled>
                  {stagesQuery.isLoading ? "Loading…" : "Select a stage"}
                </option>
                {stagesQuery.data?.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    Stage {stage.order}: {stage.title}
                  </option>
                ))}
              </select>
            </Field>

            <label className="flex items-center gap-xs font-body text-body-md text-text-primary">
              <input
                type="checkbox"
                checked={form.stageCompleted}
                onChange={(e) => update("stageCompleted", e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Mark this stage complete — advances the student to the next one
            </label>
          </Card>

          <Card className="flex flex-col gap-md">
            <Field label="Topics covered" htmlFor="topicsCovered">
              <textarea
                id="topicsCovered"
                rows={3}
                className={controlClasses}
                value={form.topicsCovered}
                onChange={(e) => update("topicsCovered", e.target.value)}
                required
              />
            </Field>

            <Field label="Strengths" htmlFor="strengths">
              <textarea
                id="strengths"
                rows={3}
                className={controlClasses}
                value={form.strengths}
                onChange={(e) => update("strengths", e.target.value)}
                required
              />
            </Field>

            <Field label="Areas to improve" htmlFor="areasToImprove">
              <textarea
                id="areasToImprove"
                rows={3}
                className={controlClasses}
                value={form.areasToImprove}
                onChange={(e) => update("areasToImprove", e.target.value)}
                required
              />
            </Field>

            <Field label="Homework" htmlFor="homework" hint="Optional">
              <textarea
                id="homework"
                rows={2}
                className={controlClasses}
                value={form.homework}
                onChange={(e) => update("homework", e.target.value)}
              />
            </Field>

            <Field label="Comments to guardian" htmlFor="trainerComments">
              <textarea
                id="trainerComments"
                rows={3}
                className={controlClasses}
                value={form.trainerComments}
                onChange={(e) => update("trainerComments", e.target.value)}
                required
              />
            </Field>
          </Card>

          {error ? (
            <p role="alert" className="font-body text-body-md text-error">
              {error}
            </p>
          ) : null}
          {confirmation ? (
            <p role="status" className="font-body text-body-md text-success">
              {confirmation}
            </p>
          ) : null}

          <Button type="submit" variant="accent" loading={createReport.isPending} className="w-full sm:w-auto">
            Send report
          </Button>
        </form>
      )}
    </div>
  );
}
