"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { localParts, localToUtc } from "@/lib/date/time";
import {
  TasksShell,
  taskFetch,
  TaskFetchState,
  type TasksProps,
} from "./task-ui";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  priorityLabels,
  statusLabels,
  type TaskOptions,
  type TaskView,
  type ChecklistItem,
} from "../task.types";
import styles from "./tasks.module.css";
export function TaskForm(props: TasksProps & { taskId?: string }) {
  const [data, setData] = useState<{
      options: TaskOptions;
      task: TaskView | null;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!props.canManage) return;
    let active = true;
    Promise.all([
      taskFetch<TaskOptions>("/api/v1/tasks/options"),
      props.taskId
        ? taskFetch<{ task: TaskView }>(`/api/v1/tasks/${props.taskId}`).then(
            (d) => d.task,
          )
        : Promise.resolve(null),
    ])
      .then(([options, task]) => {
        if (active) {
          setData({ options, task });
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.taskId, props.canManage, retry]);
  return (
    <TasksShell {...props}>
      <Link href="/tasks" className={styles.back}>
        <ArrowLeft size={16} aria-hidden />
        Back to tasks
      </Link>
      {!props.canManage ? (
        <div className={styles.empty}>
          <h1>Planning access required</h1>
          <p>You can update your assigned tasks from their details page.</p>
        </div>
      ) : loading || error || !data ? (
        <TaskFetchState
          loading={loading}
          error={error}
          retry={() => {
            setLoading(true);
            setRetry((v) => v + 1);
          }}
        />
      ) : (
        <TaskEditor
          key={data.task?.revision ?? "new"}
          {...props}
          {...data}
          reload={() => {
            setLoading(true);
            setRetry((v) => v + 1);
          }}
        />
      )}
    </TasksShell>
  );
}
function TaskEditor({
  task,
  options,
  timezone,
  taskId,
  reload,
}: TasksProps & {
  taskId?: string;
  task: TaskView | null;
  options: TaskOptions;
  reload: () => void;
}) {
  const router = useRouter();
  const [assignees, setAssignees] = useState(task?.assigneeMemberIds ?? []),
    [checklist, setChecklist] = useState<ChecklistItem[]>(
      task?.checklist ?? [],
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const due = task?.dueAt
    ? localParts(task.dueAt, timezone)
    : { date: "", time: "" };
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(e.currentTarget),
      date = String(form.get("date") ?? ""),
      time = String(form.get("time") ?? "");
    try {
      if (!!date !== !!time)
        throw new Error(
          "Choose both a deadline date and time, or leave both empty.",
        );
      const dueAt =
        date && time ? localToUtc(date, time, timezone).toISOString() : null;
      setBusy(true);
      const data = await taskFetch<{ task: TaskView }>(
        taskId ? `/api/v1/tasks/${taskId}` : "/api/v1/tasks",
        {
          method: taskId ? "PATCH" : "POST",
          body: JSON.stringify({
            title: form.get("title"),
            description: form.get("description"),
            eventId: form.get("eventId") || null,
            assigneeMemberIds: assignees,
            dueAt,
            priority: form.get("priority"),
            status: form.get("status"),
            checklist,
            ...(task ? { revision: task.revision } : {}),
          }),
        },
      );
      router.push(`/tasks/${data.task.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this task.");
      setBusy(false);
    }
  }
  const unavailable = assignees.filter(
    (id) => !options.members.some((m) => m.id === id),
  );
  return (
    <div className={styles.form}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Every detail, thoughtfully planned</p>
          <h1>{task ? "Edit your task" : "Record a small next step"}</h1>
          <p className={styles.muted}>
            Set the essentials. Add details when you need them.
          </p>
        </div>
      </header>
      <form className={styles.panel} onSubmit={save}>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.full}`}>
              Task title
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={task?.title ?? ""}
                placeholder="e.g. Finalize the Mehendi playlist"
              />
            </label>
            <label className={styles.field}>
              Priority
              <select name="priority" defaultValue={task?.priority ?? "MEDIUM"}>
                {TASK_PRIORITIES.map((s) => (
                  <option key={s} value={s}>
                    {priorityLabels[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Status
              <select name="status" defaultValue={task?.status ?? "TODO"}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <details className={styles.optional} open={task ? true : undefined}>
            <summary>Assignees, deadline & event (optional)</summary>
            <div className={styles.formGrid}>
              <div className={styles.full}>
                <p className={styles.muted}>
                  Assign active wedding members, or leave unassigned.
                </p>
                <div className={styles.memberChoices}>
                  {options.members.map((m) => (
                    <label className={styles.memberChoice} key={m.id}>
                      <input
                        type="checkbox"
                        checked={assignees.includes(m.id)}
                        onChange={(e) =>
                          setAssignees((a) =>
                            e.target.checked
                              ? [...a, m.id]
                              : a.filter((id) => id !== m.id),
                          )
                        }
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
                {unavailable.length > 0 && (
                  <p className={styles.alert}>
                    Some assignees are no longer active.{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setAssignees((a) =>
                          a.filter((id) =>
                            options.members.some((m) => m.id === id),
                          ),
                        )
                      }
                    >
                      Remove unavailable assignees
                    </button>
                  </p>
                )}
              </div>
              <label className={styles.field}>
                Deadline date
                <input name="date" type="date" defaultValue={due.date} />
              </label>
              <label className={styles.field}>
                Deadline time
                <input name="time" type="time" defaultValue={due.time} />
              </label>
              <p className={`${styles.muted} ${styles.full}`}>
                Deadline in {timezone}. Leave both empty for no deadline.
              </p>
              <label className={`${styles.field} ${styles.full}`}>
                Associated event
                <select name="eventId" defaultValue={task?.eventId ?? ""}>
                  <option value="">No event — general wedding task</option>
                  {options.events.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <label className={styles.field}>
            Notes (optional)
            <textarea
              name="description"
              maxLength={2000}
              defaultValue={task?.description ?? ""}
              placeholder="Add context, requirements, or helpful details…"
            />
          </label>
          <section style={{ marginTop: 24 }}>
            <h2>Execution checklist</h2>
            <p className={styles.muted}>
              Up to 50 small steps. Checklist completion is independent of task
              status.
            </p>
            <div className={styles.checklist}>
              {checklist.map((item, index) => (
                <div className={styles.checkItem} key={item.id}>
                  <input
                    aria-label={`Complete step ${index + 1}`}
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) =>
                      setChecklist((items) =>
                        items.map((i) =>
                          i.id === item.id
                            ? { ...i, done: e.target.checked }
                            : i,
                        ),
                      )
                    }
                  />
                  <label className={styles.field}>
                    <span className="sr-only">Step {index + 1}</span>
                    <input
                      required
                      maxLength={160}
                      value={item.title}
                      onChange={(e) =>
                        setChecklist((items) =>
                          items.map((i) =>
                            i.id === item.id
                              ? { ...i, title: e.target.value }
                              : i,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    className={styles.secondary}
                    aria-label={`Remove step ${index + 1}`}
                    type="button"
                    onClick={() =>
                      setChecklist((items) =>
                        items.filter((i) => i.id !== item.id),
                      )
                    }
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.secondary}
              disabled={checklist.length >= 50}
              onClick={() =>
                setChecklist((items) => [
                  ...items,
                  { id: crypto.randomUUID(), title: "", done: false },
                ])
              }
            >
              <Plus size={16} aria-hidden />
              Add checklist item
            </button>
          </section>
        </fieldset>
        {error && (
          <div className={styles.alert} role="alert">
            {error}
            {task && (
              <p>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={reload}
                >
                  Reload current task
                </button>{" "}
                Reloading the page discards unsaved changes.
              </p>
            )}
          </div>
        )}
        <div
          className={styles.actions}
          style={{ justifyContent: "flex-end", marginTop: 28 }}
        >
          <Link
            href={task ? `/tasks/${task.id}` : "/tasks"}
            className={styles.secondary}
          >
            Cancel
          </Link>
          <button
            className={styles.primary}
            type="submit"
            disabled={busy || unavailable.length > 0}
          >
            {busy ? "Saving…" : task ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
