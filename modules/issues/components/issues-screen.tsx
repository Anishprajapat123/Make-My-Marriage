"use client";
import { useEffect, useState } from "react";
import { CircleAlert, Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import {
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  issueLabel,
  type IssueView,
  type IssueList,
  type IssueOptions,
} from "../issue.types";
import { issueFetch, IssueRequestError } from "./issue-client";
import { IssueDialog } from "./issue-dialog";
import { IssueForm } from "./issue-form";
import { IssueDiscussion } from "./issue-comments";
import { IssueAuditHistory } from "./issue-history";
import styles from "./issues.module.css";
type Props = {
  canView: boolean;
  canReport: boolean;
  canManage: boolean;
  canComment: boolean;
  ownOnly: boolean;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
  timezone: string;
};
type Panel =
  | { kind: "CREATE" }
  | { kind: "DETAIL" | "EDIT"; row: IssueView }
  | { kind: "STATUS"; row: IssueView; next: IssueView["status"] };
export function IssuesScreen(props: Props) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [priority, setPriority] = useState(""),
    [eventId, setEventId] = useState(""),
    [assignee, setAssignee] = useState(""),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<IssueList | null>(null),
    [options, setOptions] = useState<IssueOptions | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel | null>(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [stale, setStale] = useState(false);
  useEffect(() => {
    if (!props.canView) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({ search, page: String(page) });
      if (status) query.set("status", status);
      if (priority) query.set("priority", priority);
      if (eventId) query.set("eventId", eventId);
      if (assignee) query.set("assignedToMemberId", assignee);
      Promise.all([
        issueFetch<IssueList>(`/api/v1/issues?${query}`, {
          signal: controller.signal,
        }),
        issueFetch<IssueOptions>("/api/v1/issues/options", {
          signal: controller.signal,
        }),
      ])
        .then(([value, choices]) => {
          if (controller.signal.aborted) return;
          const last = Math.max(1, Math.ceil(value.total / value.limit));
          if (page > last) {
            setPage(last);
            return;
          }
          setData(value);
          setOptions(choices);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(e.message);
            setData(null);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    props.canView,
    search,
    status,
    priority,
    eventId,
    assignee,
    page,
    refresh,
  ]);
  function close() {
    setPanel(null);
    setActionError("");
    setStale(false);
    setRefresh((n) => n + 1);
  }
  function saved() {
    close();
    setNotice("Issue saved.");
  }
  async function show(row: IssueView, kind: "DETAIL" | "EDIT") {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      const fresh = await issueFetch<IssueView>(`/api/v1/issues/${row.id}`);
      setPanel({ kind, row: fresh });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not load issue.");
    } finally {
      setBusy(false);
    }
  }
  async function transition() {
    if (panel?.kind !== "STATUS" || busy || stale) return;
    setBusy(true);
    setActionError("");
    try {
      await issueFetch(`/api/v1/issues/${panel.row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          revision: panel.row.revision,
          status: panel.next,
        }),
      });
      close();
      setNotice("Issue status updated. History and comments are retained.");
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not change status.",
      );
      if (e instanceof IssueRequestError && e.code === "CONFLICT")
        setStale(true);
    } finally {
      setBusy(false);
    }
  }
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: props.timezone,
    }).format(new Date(iso));
  const filtered = Boolean(search || status || priority || eventId || assignee);
  return (
    <WorkspaceShell
      activePage="Issues"
      weddingTitle={props.weddingTitle}
      memberName={props.memberName}
      roleLabel={props.roleLabel}
    >
      <section className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Keep the celebration moving</p>
            <h1>
              {props.ownOnly
                ? "My reported issues"
                : "Issues & Problem Reporting"}
            </h1>
            <p className={styles.muted}>
              {props.ownOnly
                ? "Report a problem and follow the conversation on your own reports."
                : "Surface wedding problems, coordinate responses and keep resolution history."}
            </p>
          </div>
          {props.canReport ? (
            <button
              className={styles.primary}
              onClick={() => {
                setActionError("");
                setPanel({ kind: "CREATE" });
              }}
            >
              <Plus size={16} aria-hidden="true" />
              Report issue
            </button>
          ) : null}
        </header>
        {!props.canView ? (
          <div className={styles.empty}>
            <CircleAlert aria-hidden="true" />
            <h2>Issue access is restricted</h2>
            <p>
              Your account does not have permission to read or report issues.
            </p>
          </div>
        ) : (
          <>
            {notice ? (
              <p role="status" className={styles.success}>
                {notice}
              </p>
            ) : null}
            {actionError && !panel ? (
              <p role="alert" className={styles.error}>
                {actionError}
              </p>
            ) : null}
            {!error && data ? (
              <section
                className={styles.stats}
                aria-label={
                  props.ownOnly ? "My report counts" : "Wedding issue counts"
                }
              >
                <div>
                  <span>Open</span>
                  <strong>{data.counts.open}</strong>
                </div>
                <div>
                  <span>In progress</span>
                  <strong>{data.counts.inProgress}</strong>
                </div>
                <div>
                  <span>Resolved</span>
                  <strong>{data.counts.resolved}</strong>
                </div>
              </section>
            ) : null}
            <p className={styles.muted}>
              Counts cover{" "}
              {props.ownOnly ? "your reports" : "the issues you can view"},
              independently of the list filters.
            </p>
            <div className={styles.filters}>
              <label className={styles.field}>
                Search issues
                <input
                  value={search}
                  maxLength={180}
                  placeholder="Search by title"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className={styles.field}>
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {ISSUE_STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {issueLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Priority
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All priorities</option>
                  {ISSUE_PRIORITIES.map((v) => (
                    <option key={v} value={v}>
                      {issueLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
              {options?.events.length ? (
                <label className={styles.field}>
                  Event
                  <select
                    value={eventId}
                    onChange={(e) => {
                      setEventId(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All permitted events</option>
                    {options.events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {props.canManage && options?.members.length ? (
                <label className={styles.field}>
                  Assigned member
                  <select
                    value={assignee}
                    onChange={(e) => {
                      setAssignee(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All assignees</option>
                    {options.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {loading ? (
              <p role="status" className={styles.empty}>
                Loading issues…
              </p>
            ) : error ? (
              <div role="alert" className={styles.empty}>
                <p>{error}</p>
                <button
                  className={styles.secondary}
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  Retry issues
                </button>
              </div>
            ) : data?.issues.length ? (
              <>
                <p className={styles.muted}>{data.total} matching reports</p>
                <ul className={styles.list} aria-label="Issues">
                  {data.issues.map((row) => (
                    <li key={row.id} className={styles.card}>
                      <div className={styles.issueCopy}>
                        <div className={styles.badges}>
                          <span
                            className={`${styles.badge} ${row.priority === "URGENT" || row.priority === "HIGH" ? styles.urgent : ""}`}
                          >
                            {issueLabel(row.priority)}
                          </span>
                          <span className={styles.badge}>
                            {issueLabel(row.status)}
                          </span>
                        </div>
                        <button
                          className={styles.titleButton}
                          disabled={busy}
                          onClick={() => show(row, "DETAIL")}
                        >
                          {row.title}
                        </button>
                        <p className={styles.muted}>
                          Reported by {row.reporterName} · {when(row.createdAt)}
                        </p>
                        <p className={styles.muted}>
                          {row.assigneeName
                            ? `Assigned to ${row.assigneeName}`
                            : "Unassigned"}
                          {row.eventName ? ` · ${row.eventName}` : ""}
                        </p>
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() => show(row, "DETAIL")}
                        >
                          View details
                        </button>
                        {props.canManage ? (
                          <button
                            className={styles.secondary}
                            disabled={busy}
                            onClick={() => show(row, "EDIT")}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                <nav className={styles.pager} aria-label="Issue pages">
                  <button
                    className={styles.secondary}
                    disabled={page === 1}
                    onClick={() => setPage((n) => n - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of{" "}
                    {Math.max(1, Math.ceil(data.total / data.limit))}
                  </span>
                  <button
                    className={styles.secondary}
                    disabled={page * data.limit >= data.total}
                    onClick={() => setPage((n) => n + 1)}
                  >
                    Next
                  </button>
                </nav>
              </>
            ) : (
              <div className={styles.empty}>
                <CircleAlert size={30} aria-hidden="true" />
                <h2>
                  {filtered ? "No matching issues" : "No issues reported"}
                </h2>
                <p>
                  {filtered
                    ? "Try adjusting the filters."
                    : "When something needs attention, report it here."}
                </p>
                {filtered ? (
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                      setPriority("");
                      setEventId("");
                      setAssignee("");
                      setPage(1);
                    }}
                  >
                    Reset filters
                  </button>
                ) : props.canReport ? (
                  <button
                    className={styles.primary}
                    onClick={() => setPanel({ kind: "CREATE" })}
                  >
                    Report issue
                  </button>
                ) : null}
              </div>
            )}
            <p className={styles.footnote}>
              Issue details and comments stay within their permitted wedding
              scope. Resolving keeps the history. No attachments, emails or
              automatic tasks are created.
            </p>
          </>
        )}
        {panel?.kind === "CREATE" ? (
          <IssueForm onClose={close} onSaved={saved} />
        ) : panel?.kind === "EDIT" ? (
          <IssueForm row={panel.row} onClose={close} onSaved={saved} />
        ) : panel?.kind === "DETAIL" ? (
          <IssueDialog title={panel.row.title} onClose={close} busy={busy}>
            <div className={styles.badges}>
              <span className={styles.badge}>
                {issueLabel(panel.row.priority)}
              </span>
              <span className={styles.badge}>
                {issueLabel(panel.row.status)}
              </span>
            </div>
            <p className={styles.description}>{panel.row.description}</p>
            <dl className={styles.details}>
              <dt>Reporter</dt>
              <dd>{panel.row.reporterName}</dd>
              <dt>Assignee</dt>
              <dd>{panel.row.assigneeName ?? "Unassigned"}</dd>
              <dt>Event</dt>
              <dd>
                {panel.row.eventName ??
                  (panel.row.eventId
                    ? "Linked event (restricted)"
                    : "No event")}
              </dd>
              <dt>Vendor</dt>
              <dd>
                {panel.row.vendorName ??
                  (panel.row.vendorId
                    ? "Linked vendor (restricted)"
                    : "No vendor")}
              </dd>
              <dt>Reported</dt>
              <dd>{when(panel.row.createdAt)}</dd>
              {panel.row.resolvedAt ? (
                <>
                  <dt>Resolved</dt>
                  <dd>{when(panel.row.resolvedAt)}</dd>
                </>
              ) : null}
            </dl>
            {props.canManage ? (
              <div className={styles.actions}>
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => setPanel({ kind: "EDIT", row: panel.row })}
                >
                  Edit issue
                </button>
                {panel.row.status === "RESOLVED" ? (
                  <button
                    className={styles.primary}
                    disabled={busy}
                    onClick={() =>
                      setPanel({ kind: "STATUS", row: panel.row, next: "OPEN" })
                    }
                  >
                    Reopen issue
                  </button>
                ) : (
                  <>
                    <button
                      className={styles.primary}
                      disabled={busy}
                      onClick={() =>
                        setPanel({
                          kind: "STATUS",
                          row: panel.row,
                          next: "RESOLVED",
                        })
                      }
                    >
                      Resolve issue
                    </button>
                    {panel.row.status === "OPEN" ? (
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() =>
                          setPanel({
                            kind: "STATUS",
                            row: panel.row,
                            next: "IN_PROGRESS",
                          })
                        }
                      >
                        Start progress
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            <IssueDiscussion
              key={panel.row.id}
              issueId={panel.row.id}
              canComment={props.canComment}
              timezone={props.timezone}
              onBusy={setBusy}
            />
            <IssueAuditHistory
              key={`history-${panel.row.id}`}
              issueId={panel.row.id}
              timezone={props.timezone}
            />
          </IssueDialog>
        ) : panel?.kind === "STATUS" ? (
          <IssueDialog
            title={
              panel.next === "RESOLVED"
                ? "Resolve issue?"
                : panel.row.status === "RESOLVED"
                  ? "Reopen issue?"
                  : "Start progress?"
            }
            onClose={close}
            busy={busy}
          >
            <p>{panel.row.title}</p>
            <p className={styles.muted}>
              Set this issue to {issueLabel(panel.next)}. Comments and history
              will be retained.
            </p>
            {actionError ? (
              <p role="alert" className={styles.error}>
                {actionError}
              </p>
            ) : null}
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={busy || stale}
                onClick={transition}
              >
                {busy ? "Saving…" : "Confirm status change"}
              </button>
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={close}
              >
                {stale ? "Close and reload" : "Cancel"}
              </button>
            </div>
          </IssueDialog>
        ) : null}
      </section>
    </WorkspaceShell>
  );
}
