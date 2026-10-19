"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, CheckSquare } from "lucide-react";
import {
  TasksShell,
  taskFetch,
  taskDate,
  TaskFetchState,
  type TasksProps,
} from "./task-ui";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  priorityLabels,
  statusLabels,
  type TaskList,
  type TaskOptions,
} from "../task.types";
import styles from "./tasks.module.css";
const initialFilters = {
  q: "",
  status: "",
  priority: "",
  eventId: "",
  assigneeMemberId: "",
  mine: false,
  overdue: false,
};
export function TasksScreen(props: TasksProps) {
  const [data, setData] = useState<TaskList | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [options, setOptions] = useState<TaskOptions>({
      events: [],
      members: [],
    }),
    [optionError, setOptionError] = useState("");
  useEffect(() => {
    if (!props.canManage) return;
    let active = true;
    taskFetch<TaskOptions>("/api/v1/tasks/options")
      .then((o) => {
        if (active) {
          setOptions(o);
          setOptionError("");
        }
      })
      .catch((e) => {
        if (active) setOptionError(e.message);
      });
    return () => {
      active = false;
    };
  }, [props.canManage, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({ page: String(page) });
      for (const [key, value] of Object.entries(filters))
        if (value) query.set(key, String(value));
      taskFetch<TaskList>(`/api/v1/tasks?${query}`, {
        signal: controller.signal,
      })
        .then((d) => {
          if (!controller.signal.aborted) setData(d);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, page, refresh]);
  function filter(key: keyof typeof filters, value: string | boolean) {
    setLoading(true);
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }
  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <TasksShell {...props}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Tasks & operations</p>
          <h1>
            {props.canManage
              ? "A little planning. A beautiful day."
              : "Your part in the celebration."}
          </h1>
          <p className={styles.muted}>
            {props.canManage
              ? "Keep every detail moving, together."
              : "Your assigned tasks, checklists, and deadlines."}
          </p>
        </div>
        {props.canManage && (
          <Link className={styles.primary} href="/tasks/new">
            <Plus size={16} aria-hidden />
            Create task
          </Link>
        )}
      </header>
      {data && (
        <section
          className={styles.stats}
          aria-label="Task counts within your access"
        >
          <div className={styles.stat}>
            <strong>{data.counts.total}</strong>
            <span>Total tasks</span>
          </div>
          <div className={styles.stat}>
            <strong>{data.counts.todo}</strong>
            <span>To do</span>
          </div>
          <div className={styles.stat}>
            <strong>{data.counts.inProgress}</strong>
            <span>In progress</span>
          </div>
          <div className={styles.stat}>
            <strong>{data.counts.completed}</strong>
            <span>Completed</span>
          </div>
          <div className={styles.stat}>
            <strong className={styles.overdue}>{data.counts.overdue}</strong>
            <span>Overdue</span>
          </div>
        </section>
      )}
      <section className={styles.filters} aria-label="Filter tasks">
        <div className={styles.filterGrid}>
          <label className={styles.field}>
            Search tasks
            <input
              type="search"
              placeholder="Search task titles"
              value={filters.q}
              onChange={(e) => filter("q", e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Status
            <select
              value={filters.status}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Priority
            <select
              value={filters.priority}
              onChange={(e) => filter("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((s) => (
                <option key={s} value={s}>
                  {priorityLabels[s]}
                </option>
              ))}
            </select>
          </label>
          {props.canManage && (
            <>
              <label className={styles.field}>
                Event
                <select
                  value={filters.eventId}
                  onChange={(e) => filter("eventId", e.target.value)}
                  disabled={!!optionError}
                >
                  <option value="">All events</option>
                  {options.events.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Assignee
                <select
                  value={filters.assigneeMemberId}
                  onChange={(e) => filter("assigneeMemberId", e.target.value)}
                  disabled={!!optionError}
                >
                  <option value="">All members</option>
                  {options.members.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div className={styles.checks}>
          {props.canManage && (
            <label>
              <input
                type="checkbox"
                checked={filters.mine}
                onChange={(e) => filter("mine", e.target.checked)}
              />
              My tasks
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={filters.overdue}
              onChange={(e) => filter("overdue", e.target.checked)}
            />
            Overdue only
          </label>
          {hasFilters && (
            <button
              className={styles.secondary}
              onClick={() => {
                setPage(1);
                setFilters(initialFilters);
                setLoading(true);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {optionError && (
          <p className={styles.alert} role="alert">
            Filters couldn’t load: {optionError}{" "}
            <button onClick={() => setRefresh((r) => r + 1)}>
              Retry filters
            </button>
          </p>
        )}
      </section>
      {loading || error ? (
        <TaskFetchState
          loading={loading}
          error={error}
          retry={() => {
            setLoading(true);
            setRefresh((r) => r + 1);
          }}
        />
      ) : !data?.tasks.length ? (
        <div className={styles.empty}>
          <CheckSquare size={30} aria-hidden />
          <h2>
            {hasFilters
              ? "No tasks match these filters"
              : page > 1
                ? "No tasks on this page"
                : "Room for your next small step"}
          </h2>
          <p className={styles.muted}>
            {hasFilters
              ? "Try another search or clear your filters."
              : props.canManage
                ? "Create your first task and bring the details together."
                : "Tasks assigned to you will appear here."}
          </p>
          {props.canManage && !hasFilters && (
            <Link className={styles.primary} href="/tasks/new">
              Create task
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className={styles.muted}>
            {data.total} matching {data.total === 1 ? "task" : "tasks"} ·
            deadlines in {props.timezone}
          </p>
          <div className={styles.list}>
            {data.tasks.map((task) => (
              <Link
                className={styles.row}
                href={`/tasks/${task.id}`}
                key={task.id}
              >
                <div>
                  <div className={styles.badges}>
                    <span className={styles.badge}>
                      {priorityLabels[task.priority]} priority
                    </span>
                    <span className={styles.badge}>
                      {statusLabels[task.status]}
                    </span>
                  </div>
                  <h3>{task.title}</h3>
                  <span className={styles.muted}>
                    {task.eventName ??
                      options.events.find((e) => e.id === task.eventId)?.name ??
                      (task.eventId ? "Linked event" : "General wedding task")}
                  </span>
                </div>
                <span
                  className={`${styles.muted} ${task.dueAt && task.status !== "COMPLETED" && new Date(task.dueAt) < new Date() ? styles.overdue : ""}`}
                >
                  {taskDate(task.dueAt, props.timezone)}
                </span>
                <span className={styles.muted}>
                  {task.assigneeMemberIds.length
                    ? task.assigneeMemberIds
                        .map(
                          (id) =>
                            task.assignees?.find((m) => m.id === id)?.name ??
                            options.members.find((m) => m.id === id)?.name ??
                            (id === props.memberId ? "You" : "Member"),
                        )
                        .join(", ")
                    : "Unassigned"}
                </span>
                <span className={styles.muted}>
                  {task.checklist.filter((i) => i.done).length}/
                  {task.checklist.length} checklist items{" "}
                  <ArrowRight size={14} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
      {!loading && !error && data && (data.total > 25 || page > 1) && (
        <nav className={styles.pager} aria-label="Task pages">
          <button
            className={styles.secondary}
            disabled={page === 1}
            onClick={() => {
              setLoading(true);
              setPage((p) => p - 1);
            }}
          >
            Previous
          </button>
          <span className={styles.muted}>Page {page}</span>
          <button
            className={styles.secondary}
            disabled={page * 25 >= data.total}
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
          >
            Next
          </button>
        </nav>
      )}
    </TasksShell>
  );
}
