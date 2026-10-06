"use client";

import { ApiError, type AdminCreateLevelInput, type AdminCreateTopicInput, type Stage } from "@rubies/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClasses, Field } from "@/components/ui/Field";

// Fixed by the academy's curriculum design — not admin-creatable, only
// their Levels and Topics are.
const STAGES: { value: Stage; label: string }[] = [
  { value: "scratch", label: "Scratch" },
  { value: "creator", label: "Creator" },
  { value: "innovator", label: "Innovator" },
];

const EMPTY_LEVEL_FORM = { stage: "scratch" as Stage, order: "", title: "", description: "" };
const EMPTY_TOPIC_FORM = { levelId: "", order: "", title: "", description: "" };

export default function AdminCurriculumPage() {
  const queryClient = useQueryClient();
  const levelsQuery = useQuery({
    queryKey: ["admin", "levels"],
    queryFn: () => api.admin.levels.list(),
  });

  const [levelForm, setLevelForm] = useState(EMPTY_LEVEL_FORM);
  const [levelError, setLevelError] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState(EMPTY_TOPIC_FORM);
  const [topicError, setTopicError] = useState<string | null>(null);

  const createLevel = useMutation({
    mutationFn: (input: AdminCreateLevelInput) => api.admin.levels.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "levels"] });
      setLevelForm(EMPTY_LEVEL_FORM);
      setLevelError(null);
    },
    onError: (err) => {
      setLevelError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    },
  });

  const createTopic = useMutation({
    mutationFn: (input: AdminCreateTopicInput) => api.admin.topics.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "levels"] });
      setTopicForm((f) => ({ ...EMPTY_TOPIC_FORM, levelId: f.levelId })); // keep the level picked
      setTopicError(null);
    },
    onError: (err) => {
      setTopicError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    },
  });

  function onSubmitLevel(e: FormEvent) {
    e.preventDefault();
    setLevelError(null);
    const order = Number(levelForm.order);
    if (!Number.isInteger(order) || order < 1) {
      setLevelError("Order must be a whole number, 1 or higher.");
      return;
    }
    if (!levelForm.title.trim()) {
      setLevelError("Title is required.");
      return;
    }
    createLevel.mutate({
      stage: levelForm.stage,
      order,
      title: levelForm.title.trim(),
      description: levelForm.description.trim() || undefined,
    });
  }

  function onSubmitTopic(e: FormEvent) {
    e.preventDefault();
    setTopicError(null);
    const order = Number(topicForm.order);
    if (!topicForm.levelId) {
      setTopicError("Choose a level.");
      return;
    }
    if (!Number.isInteger(order) || order < 1) {
      setTopicError("Order must be a whole number, 1 or higher.");
      return;
    }
    if (!topicForm.title.trim()) {
      setTopicError("Title is required.");
      return;
    }
    createTopic.mutate({
      levelId: topicForm.levelId,
      order,
      title: topicForm.title.trim(),
      description: topicForm.description.trim() || undefined,
    });
  }

  const levels = levelsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-display text-headline-md font-bold text-text-primary">Curriculum</h1>
        <p className="mt-2xs font-body text-body-md text-text-secondary">
          The academy has 3 fixed stages — Scratch, Creator, Innovator. Add Levels within a
          stage, then Topics within a level. A student auto-advances Topic → next Topic →
          next Level → next Stage as trainers mark reports complete.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-title-lg font-semibold text-text-primary">Add a level</h2>
          <form onSubmit={onSubmitLevel} className="mt-md flex flex-col gap-md">
            <Field label="Stage" htmlFor="level-stage">
              <select
                id="level-stage"
                className={controlClasses}
                value={levelForm.stage}
                onChange={(e) => setLevelForm({ ...levelForm, stage: e.target.value as Stage })}
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Order" htmlFor="level-order" hint="1, 2, 3… position within the stage">
              <input
                id="level-order"
                type="number"
                min={1}
                className={controlClasses}
                value={levelForm.order}
                onChange={(e) => setLevelForm({ ...levelForm, order: e.target.value })}
                required
              />
            </Field>

            <Field label="Title" htmlFor="level-title" hint="e.g. Level 1: Getting Started">
              <input
                id="level-title"
                className={controlClasses}
                value={levelForm.title}
                onChange={(e) => setLevelForm({ ...levelForm, title: e.target.value })}
                required
              />
            </Field>

            <Field label="Description" htmlFor="level-description" hint="Optional">
              <input
                id="level-description"
                className={controlClasses}
                value={levelForm.description}
                onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
              />
            </Field>

            {levelError ? (
              <p role="alert" className="font-body text-body-sm text-error">
                {levelError}
              </p>
            ) : null}

            <Button type="submit" variant="accent" loading={createLevel.isPending} className="self-start">
              Add level
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-title-lg font-semibold text-text-primary">Add a topic</h2>

          {levels.length === 0 && !levelsQuery.isLoading ? (
            <p className="mt-sm font-body text-body-sm text-text-secondary">
              Add a level first — topics live inside a level.
            </p>
          ) : null}

          <form onSubmit={onSubmitTopic} className="mt-md flex flex-col gap-md">
            <Field label="Level" htmlFor="topic-level">
              <select
                id="topic-level"
                className={controlClasses}
                value={topicForm.levelId}
                onChange={(e) => setTopicForm({ ...topicForm, levelId: e.target.value })}
                required
              >
                <option value="">Select a level…</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.stage} — L{l.order}: {l.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Order" htmlFor="topic-order" hint="1, 2, 3… position within the level">
              <input
                id="topic-order"
                type="number"
                min={1}
                className={controlClasses}
                value={topicForm.order}
                onChange={(e) => setTopicForm({ ...topicForm, order: e.target.value })}
                required
              />
            </Field>

            <Field label="Title" htmlFor="topic-title" hint="e.g. Sprite Movement">
              <input
                id="topic-title"
                className={controlClasses}
                value={topicForm.title}
                onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                required
              />
            </Field>

            <Field label="Description" htmlFor="topic-description" hint="Optional">
              <input
                id="topic-description"
                className={controlClasses}
                value={topicForm.description}
                onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
              />
            </Field>

            {topicError ? (
              <p role="alert" className="font-body text-body-sm text-error">
                {topicError}
              </p>
            ) : null}

            <Button type="submit" variant="accent" loading={createTopic.isPending} className="self-start">
              Add topic
            </Button>
          </form>
        </Card>
      </div>

      {STAGES.map((stage) => {
        const stageLevels = levels
          .filter((l) => l.stage === stage.value)
          .sort((a, b) => a.order - b.order);
        return (
          <Card key={stage.value}>
            <h2 className="font-display text-title-lg font-semibold text-text-primary">{stage.label}</h2>
            {levelsQuery.isLoading ? (
              <p className="mt-md font-body text-body-md text-text-secondary">Loading…</p>
            ) : stageLevels.length === 0 ? (
              <p className="mt-md font-body text-body-md text-text-secondary">No levels yet.</p>
            ) : (
              <div className="mt-md flex flex-col gap-md">
                {stageLevels.map((level) => (
                  <div key={level.id}>
                    <h3 className="font-body text-label-lg font-semibold text-text-secondary">
                      L{level.order}: {level.title}
                    </h3>
                    <ul className="mt-xs flex flex-col divide-y divide-border">
                      {[...level.topics]
                        .sort((a, b) => a.order - b.order)
                        .map((topic) => (
                          <li key={topic.id} className="flex items-center gap-sm py-sm">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas-tint font-mono text-label-sm font-semibold text-text-secondary">
                              {topic.order}
                            </span>
                            <div>
                              <p className="font-body text-body-md font-semibold text-text-primary">
                                {topic.title}
                              </p>
                              {topic.description ? (
                                <p className="font-body text-body-sm text-text-secondary">
                                  {topic.description}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      {level.topics.length === 0 ? (
                        <li className="py-sm font-body text-body-sm text-text-secondary">
                          No topics yet.
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
