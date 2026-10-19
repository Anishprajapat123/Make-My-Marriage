"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  TasksShell,
  taskFetch,
  taskDate,
  TaskFetchState,
  type TasksProps,
} from "./task-ui";
import {
  TASK_STATUSES,
  priorityLabels,
  statusLabels,
  type TaskView,
  type TaskOptions,
  type TaskStatus,
  type TaskComment,
} from "../task.types";
import styles from "./tasks.module.css";
import { TaskHistory } from "./task-history";
export function TaskDetails(props: TasksProps & { taskId: string }) {
  const router = useRouter();
  const [task, setTask] = useState<TaskView | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const [options, setOptions] = useState<TaskOptions>({
    events: [],
    members: [],
  });
  useEffect(() => {
    let active = true;
    taskFetch<{ task: TaskView }>(`/api/v1/tasks/${props.taskId}`)
      .then((d) => {
        if (active) {
          setTask(d.task);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    if (props.canManage)
      taskFetch<TaskOptions>("/api/v1/tasks/options")
        .then((o) => {
          if (active) setOptions(o);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [props.taskId, props.canManage, refresh]);
  function reload() {
    setLoading(true);
    setSaveError("");
    setNotice("");
    setRefresh((r) => r + 1);
  }
  async function update(status: TaskStatus, checklist = task!.checklist) {
    if (!task || busy) return;
    setBusy(true);
    setSaveError("");
    setNotice("");
    try {
      const fields = props.canManage
        ? { status, checklist, revision: task.revision }
        : {
            status,
            checklist: checklist.map((i) => ({ id: i.id, done: i.done })),
            revision: task.revision,
          };
      const data = await taskFetch<{ task: TaskView }>(
        `/api/v1/tasks/${task.id}`,
        { method: "PATCH", body: JSON.stringify(fields) },
      );
      setTask({
        ...data.task,
        assignees: task.assignees,
        eventName: task.eventName,
      });
      setNotice("Task updated.");
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Could not save this change.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!task || busy) return;
    setBusy(true);
    setSaveError("");
    try {
      await taskFetch(`/api/v1/tasks/${task.id}`, {
        method: "DELETE",
        body: JSON.stringify({ revision: task.revision }),
      });
      router.push("/tasks");
      router.refresh();
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Could not delete this task.",
      );
      setBusy(false);
    }
  }
  const canUpdate =
    props.canManage ||
    !!(
      props.canUpdateAssigned &&
      task?.assigneeMemberIds.includes(props.memberId)
    );
  return (
    <TasksShell {...props}>
      <Link href="/tasks" className={styles.back}>
        <ArrowLeft size={16} aria-hidden />
        Back to tasks
      </Link>
      {loading || error || !task ? (
        <TaskFetchState loading={loading} error={error} retry={reload} />
      ) : (
        <>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Task details</p>
              <div className={styles.badges}>
                <span className={styles.badge}>
                  {priorityLabels[task.priority]} priority
                </span>
                <span className={styles.badge}>
                  {statusLabels[task.status]}
                </span>
              </div>
            </div>
            <div className={styles.actions}>
              {canUpdate && (
                <label className={styles.field}>
                  Task status
                  <select
                    aria-label="Task status"
                    value={task.status}
                    disabled={busy}
                    onChange={(e) => update(e.target.value as TaskStatus)}
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {props.canManage && (
                <Link
                  className={styles.secondary}
                  href={`/tasks/${task.id}/edit`}
                >
                  <Pencil size={15} aria-hidden />
                  Edit task
                </Link>
              )}
            </div>
          </header>
          {saveError && (
            <div className={styles.alert} role="alert">
              {saveError}{" "}
              <button
                className={styles.secondary}
                onClick={reload}
                disabled={busy}
              >
                Reload task
              </button>
            </div>
          )}
          {notice && (
            <p role="status" className={styles.success}>
              {notice}
            </p>
          )}
          <div className={styles.detailGrid}>
            <div className={styles.stack}>
              <section className={styles.panel}>
                <h1>{task.title}</h1>
                <p className={styles.description}>
                  {task.description || "No notes added yet."}
                </p>
              </section>
              <section className={styles.panel}>
                <h2>Execution checklist</h2>
                <p className={styles.muted}>
                  {task.checklist.filter((i) => i.done).length} of{" "}
                  {task.checklist.length} completed
                </p>
                {task.checklist.length > 0 && (
                  <progress
                    className={styles.progress}
                    aria-label="Checklist completion"
                    value={task.checklist.filter((i) => i.done).length}
                    max={task.checklist.length}
                  />
                )}
                <div className={styles.checklist}>
                  {task.checklist.map((item) => (
                    <div key={item.id} className={styles.checkItem}>
                      <label className={item.done ? styles.done : ""}>
                        <input
                          type="checkbox"
                          checked={item.done}
                          disabled={!canUpdate || busy}
                          onChange={(e) =>
                            update(
                              task.status,
                              task.checklist.map((i) =>
                                i.id === item.id
                                  ? { ...i, done: e.target.checked }
                                  : i,
                              ),
                            )
                          }
                        />
                        {item.title}
                      </label>
                    </div>
                  ))}
                </div>
                {!task.checklist.length && (
                  <p className={styles.muted}>No checklist items added.</p>
                )}
                {props.canManage && (
                  <Link
                    className={styles.secondary}
                    href={`/tasks/${task.id}/edit`}
                  >
                    Edit checklist
                  </Link>
                )}
              </section>
              <Comments
                taskId={task.id}
                canPost={props.canManage}
                timezone={props.timezone}
              />
            </div>
            <aside className={styles.stack}>
              <TaskHistory
                taskId={task.id}
                revision={task.revision}
                timezone={props.timezone}
              />
              <section className={styles.panel}>
                <h2>The essentials</h2>
                <dl className={styles.meta}>
                  <div>
                    <dt>Deadline · {props.timezone}</dt>
                    <dd
                      className={
                        task.dueAt &&
                        task.status !== "COMPLETED" &&
                        new Date(task.dueAt) < new Date()
                          ? styles.overdue
                          : ""
                      }
                    >
                      {taskDate(task.dueAt, props.timezone)}
                    </dd>
                  </div>
                  <div>
                    <dt>Associated event</dt>
                    <dd>
                      {task.eventName ??
                        options.events.find((e) => e.id === task.eventId)
                          ?.name ??
                        (task.eventId
                          ? "Linked wedding event"
                          : "General wedding task")}
                    </dd>
                  </div>
                  <div>
                    <dt>Assigned members</dt>
                    <dd>
                      {task.assigneeMemberIds.length
                        ? task.assigneeMemberIds
                            .map(
                              (id) =>
                                task.assignees?.find((m) => m.id === id)
                                  ?.name ??
                                options.members.find((m) => m.id === id)
                                  ?.name ??
                                (id === props.memberId ? "You" : "Member"),
                            )
                            .join(", ")
                        : "Unassigned"}
                    </dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{taskDate(task.updatedAt, props.timezone)}</dd>
                  </div>
                  {task.completedAt && (
                    <div>
                      <dt>Completed</dt>
                      <dd>{taskDate(task.completedAt, props.timezone)}</dd>
                    </div>
                  )}
                </dl>
              </section>
              {!props.canManage && (
                <section className={styles.panel}>
                  <p className={styles.muted}>
                    {canUpdate
                      ? "You can update status and checklist completion. Ask a planner to change the task details."
                      : "You have read-only access to this task."}
                  </p>
                </section>
              )}
              {props.canManage && (
                <section className={styles.panel}>
                  {confirmDelete ? (
                    <>
                      <h2>Delete this task?</h2>
                      <p className={styles.muted}>
                        This permanently removes the task and its comments.
                      </p>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() => setConfirmDelete(false)}
                        >
                          Keep task
                        </button>
                        <button
                          className={styles.danger}
                          disabled={busy}
                          onClick={remove}
                        >
                          {busy ? "Deleting…" : "Confirm deletion"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className={styles.danger}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete task
                    </button>
                  )}
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </TasksShell>
  );
}
function Comments({
  taskId,
  canPost,
  timezone,
}: {
  taskId: string;
  canPost: boolean;
  timezone: string;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    taskFetch<{ comments: TaskComment[]; hasMore: boolean }>(
      `/api/v1/tasks/${taskId}/comments?page=${page}`,
    )
      .then((d) => {
        if (active) {
          setComments(d.comments);
          setHasMore(d.hasMore);
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
  }, [taskId, page, refresh]);
  return (
    <section className={styles.panel}>
      <h2>Coordination & discussion</h2>
      {loading ? (
        <p role="status" className={styles.muted}>
          Loading comments…
        </p>
      ) : error ? (
        <p className={styles.alert} role="alert">
          {error}{" "}
          <button
            className={styles.secondary}
            onClick={() => {
              setLoading(true);
              setRefresh((r) => r + 1);
            }}
          >
            Retry comments
          </button>
        </p>
      ) : comments.length ? (
        comments.map((c) => (
          <article className={styles.comment} key={c.id}>
            <header>
              <strong>{c.authorName}</strong>
              <time className={styles.muted} dateTime={c.createdAt}>
                {taskDate(c.createdAt, timezone)}
              </time>
            </header>
            <p>{c.body}</p>
          </article>
        ))
      ) : (
        <p className={styles.muted}>No comments yet.</p>
      )}
      {(page > 1 || hasMore) && (
        <div className={styles.pager}>
          <button
            className={styles.secondary}
            disabled={loading || page === 1}
            onClick={() => {
              setLoading(true);
              setPage((p) => p - 1);
            }}
          >
            Newer
          </button>
          <span className={styles.muted}>Page {page}</span>
          <button
            className={styles.secondary}
            disabled={loading || !hasMore}
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
          >
            Older
          </button>
        </div>
      )}
      {canPost && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !body.trim()) return;
            setBusy(true);
            setError("");
            try {
              await taskFetch(`/api/v1/tasks/${taskId}/comments`, {
                method: "POST",
                body: JSON.stringify({ body }),
              });
              setBody("");
              setPage(1);
              setLoading(true);
              setRefresh((r) => r + 1);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not post this comment.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className={styles.field}>
            Add a comment
            <textarea
              required
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              placeholder="Share a helpful update…"
            />
          </label>
          <div
            className={styles.actions}
            style={{ justifyContent: "flex-end", marginTop: 12 }}
          >
            <button
              className={styles.primary}
              disabled={busy || !body.trim()}
              type="submit"
            >
              {busy ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
