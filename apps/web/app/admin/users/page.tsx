"use client";

import { ApiError, type AdminCreateUserInput, type LevelWithTopics, type Role } from "@rubies/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClasses, Field } from "@/components/ui/Field";

const ROLE_BADGE: Record<Role, string> = {
  student: "bg-role-student-bg text-role-student-text",
  trainer: "bg-role-trainer-bg text-role-trainer-text",
  admin: "bg-role-admin-bg text-role-admin-text",
};

/** 4-digit code, easy for a parent to read aloud or type on a phone. */
function generatePasscode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const EMPTY_FORM: AdminCreateUserInput = {
  schoolId: "",
  role: "student",
  firstName: "",
  lastName: "",
  email: "",
  guardianName: "",
  guardianEmail: "",
  startingTopicId: "",
  title: "",
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: () => api.admin.users.list() });
  const levelsQuery = useQuery({ queryKey: ["admin", "levels"], queryFn: () => api.admin.levels.list() });
  // Flatten Stage -> Level -> Topic for a single "starting point" picker.
  const topicOptions = (levelsQuery.data ?? []).flatMap((level: LevelWithTopics) =>
    level.topics.map((topic) => ({ id: topic.id, label: `${level.stage} L${level.order}: ${topic.title}` })),
  );

  const [form, setForm] = useState<AdminCreateUserInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [passcodeInputs, setPasscodeInputs] = useState<Record<string, string>>({});
  const [passcodeMessage, setPasscodeMessage] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const createUser = useMutation({
    mutationFn: (input: AdminCreateUserInput) => api.admin.users.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    },
  });

  const setStrictModePasscode = useMutation({
    mutationFn: ({ userId, passcode }: { userId: string; passcode: string }) =>
      api.admin.students.setStrictModePasscode(userId, passcode),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setPasscodeInputs((prev) => ({ ...prev, [variables.userId]: "" }));
      setPasscodeError(null);
      setPasscodeMessage("Strict Mode passcode set. Share it with the parent directly — not in a group chat.");
    },
    onError: (err) => {
      setPasscodeMessage(null);
      setPasscodeError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    },
  });

  const resetPassword = useMutation({
    mutationFn: (userId: string) => api.admin.users.resetPassword(userId),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setResetMessage(
        `${user.firstName} ${user.lastName}'s password was reset to their lowercase surname. They'll be asked to change it on next login.`,
      );
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.role === "student" && !form.guardianEmail) {
      setFormError("Guardian email is required for a student.");
      return;
    }

    const input: AdminCreateUserInput = {
      schoolId: form.schoolId.trim(),
      role: form.role,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email?.trim() || undefined,
      ...(form.role === "student"
        ? {
            guardianName: form.guardianName?.trim() || undefined,
            guardianEmail: form.guardianEmail?.trim(),
            startingTopicId: form.startingTopicId?.trim() || undefined,
          }
        : {}),
      ...(form.role === "trainer" ? { title: form.title?.trim() || undefined } : {}),
    };

    createUser.mutate(input);
  }

  const users = usersQuery.data ?? [];

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-display text-headline-md font-bold text-text-primary">Users</h1>
        <p className="mt-2xs font-body text-body-md text-text-secondary">
          Create trainer and student accounts, and reset passwords when someone's locked out.
        </p>
      </div>

      <Card>
        <h2 className="font-display text-title-lg font-semibold text-text-primary">Add a user</h2>

        <form onSubmit={onSubmit} className="mt-md flex flex-col gap-md">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Field label="Role" htmlFor="role">
              <select
                id="role"
                className={controlClasses}
                value={form.role}
                onChange={(e) => setForm({ ...EMPTY_FORM, role: e.target.value as Role })}
              >
                <option value="student">Student</option>
                <option value="trainer">Trainer</option>
                <option value="admin">Admin</option>
              </select>
            </Field>

            <Field label="School ID" htmlFor="schoolId" hint="e.g. RCS-STU-2026-014">
              <input
                id="schoolId"
                className={controlClasses}
                value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                required
              />
            </Field>

            <Field label="First name" htmlFor="firstName">
              <input
                id="firstName"
                className={controlClasses}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </Field>

            <Field label="Last name" htmlFor="lastName" hint="Also becomes their default password">
              <input
                id="lastName"
                className={controlClasses}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </Field>

            <Field label="Email" htmlFor="email" hint="Optional">
              <input
                id="email"
                type="email"
                className={controlClasses}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>

            {form.role === "trainer" ? (
              <Field label="Title" htmlFor="title" hint="e.g. Lead Web Architect (optional)">
                <input
                  id="title"
                  className={controlClasses}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
            ) : null}

            {form.role === "student" ? (
              <>
                <Field label="Starting topic" htmlFor="startingTopicId" hint="Optional — can be set later">
                  <select
                    id="startingTopicId"
                    className={controlClasses}
                    value={form.startingTopicId}
                    onChange={(e) => setForm({ ...form, startingTopicId: e.target.value })}
                    disabled={levelsQuery.isLoading}
                  >
                    <option value="">None yet</option>
                    {topicOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Guardian name" htmlFor="guardianName" hint="Optional">
                  <input
                    id="guardianName"
                    className={controlClasses}
                    value={form.guardianName}
                    onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                  />
                </Field>

                <Field label="Guardian email" htmlFor="guardianEmail" hint="Reports are sent here">
                  <input
                    id="guardianEmail"
                    type="email"
                    className={controlClasses}
                    value={form.guardianEmail}
                    onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
                    required
                  />
                </Field>
              </>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="font-body text-body-sm text-error">
              {formError}
            </p>
          ) : null}

          <Button type="submit" variant="accent" loading={createUser.isPending} className="self-start">
            Create user
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-title-lg font-semibold text-text-primary">All users</h2>

        {resetMessage ? (
          <p className="mt-sm rounded-md bg-canvas-tint p-sm font-body text-body-sm text-text-primary">
            {resetMessage}
          </p>
        ) : null}
        {passcodeMessage ? (
          <p className="mt-sm rounded-md bg-canvas-tint p-sm font-body text-body-sm text-text-primary">
            {passcodeMessage}
          </p>
        ) : null}
        {passcodeError ? (
          <p role="alert" className="mt-sm font-body text-body-sm text-error">
            {passcodeError}
          </p>
        ) : null}

        {usersQuery.isLoading ? (
          <p className="mt-md font-body text-body-md text-text-secondary">Loading…</p>
        ) : users.length === 0 ? (
          <p className="mt-md font-body text-body-md text-text-secondary">No users yet.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">
                    School ID
                  </th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">
                    Name
                  </th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">
                    Role
                  </th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">
                    Password
                  </th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">
                    Strict Mode passcode
                  </th>
                  <th className="py-xs font-body text-label-md font-semibold text-text-secondary">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-sm font-mono text-body-sm text-text-primary">{u.schoolId}</td>
                    <td className="py-sm font-body text-body-md text-text-primary">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-sm">
                      <span
                        className={[
                          "rounded-base px-xs py-1 font-body text-label-sm font-semibold capitalize",
                          ROLE_BADGE[u.role],
                        ].join(" ")}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-sm font-body text-body-sm text-text-secondary">
                      {u.mustChangePassword ? "Default (unchanged)" : "Set by user"}
                    </td>
                    <td className="py-sm">
                      {u.role === "student" ? (
                        <div className="flex items-center gap-2xs">
                          <input
                            value={passcodeInputs[u.id] ?? ""}
                            onChange={(e) =>
                              setPasscodeInputs((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            placeholder="4–6 digits"
                            maxLength={6}
                            className={controlClasses + " w-24"}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPasscodeInputs((prev) => ({ ...prev, [u.id]: generatePasscode() }))
                            }
                            className="font-body text-body-sm font-semibold text-text-secondary hover:underline"
                          >
                            Generate
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStrictModePasscode.mutate({
                                userId: u.id,
                                passcode: (passcodeInputs[u.id] ?? "").trim(),
                              })
                            }
                            disabled={
                              setStrictModePasscode.isPending || !(passcodeInputs[u.id] ?? "").trim()
                            }
                            className="font-body text-body-sm font-semibold text-primary hover:underline disabled:opacity-50"
                          >
                            Set
                          </button>
                        </div>
                      ) : (
                        <span className="font-body text-body-sm text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="py-sm text-right">
                      <button
                        type="button"
                        onClick={() => resetPassword.mutate(u.id)}
                        disabled={resetPassword.isPending}
                        className="font-body text-body-sm font-semibold text-primary hover:underline disabled:opacity-50"
                      >
                        Reset password
                      </button>
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
