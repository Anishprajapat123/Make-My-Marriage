"use client";
import { useEffect, useState } from "react";
import { Plus, ReceiptText, Search } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATES,
  expenseLabel,
  categoryLabel,
  type ExpenseList,
  type ExpenseSummary,
  type ExpenseView,
  type ExpenseOptions,
} from "../expense.types";
import { formatMoney } from "../expense.money";
import { formatEventTime } from "@/lib/date/time";
import { expenseFetch } from "./expense-client";
import { ExpenseForm, PaymentForm } from "./expense-forms";
import { ExpenseDialog } from "./expense-dialog";
import styles from "./expenses.module.css";
type Props = {
  canView: boolean;
  canManage: boolean;
  canPay: boolean;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
  timezone: string;
};
type Panel =
  | { kind: "CREATE" }
  | {
      kind: "DETAIL" | "EDIT" | "PAY" | "ARCHIVE" | "RESTORE";
      row: ExpenseView;
    };
export function ExpensesScreen(props: Props) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [financialState, setState] = useState(""),
    [eventId, setEventId] = useState(""),
    [status, setStatus] = useState("ACTIVE"),
    [overdue, setOverdue] = useState(false),
    [sort, setSort] = useState("NEWEST"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<ExpenseList | null>(null),
    [summary, setSummary] = useState<ExpenseSummary | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel | null>(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const [eventChoices, setEventChoices] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!props.canView) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({
        search,
        status,
        overdue: String(overdue),
        sort,
        page: String(page),
        limit: "25",
      });
      if (category.trim()) query.set("category", category);
      if (financialState) query.set("financialState", financialState);
      if (eventId) query.set("eventId", eventId);
      Promise.all([
        expenseFetch<ExpenseList>(`/api/v1/expenses?${query}`, {
          signal: controller.signal,
        }),
        expenseFetch<ExpenseSummary>("/api/v1/expenses/summary", {
          signal: controller.signal,
        }),
        expenseFetch<ExpenseOptions>("/api/v1/expenses/options", {
          signal: controller.signal,
        }),
      ])
        .then(([list, totals, choices]) => {
          if (!controller.signal.aborted) {
            const lastPage = Math.max(1, Math.ceil(list.total / list.limit));
            if (page > lastPage) {
              setPage(lastPage);
              return;
            }
            setData(list);
            setSummary(totals);
            setEventChoices(
              Object.fromEntries(choices.events.map((e) => [e.id, e.name])),
            );
          }
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
  }, [
    props.canView,
    search,
    category,
    financialState,
    eventId,
    status,
    overdue,
    sort,
    page,
    refresh,
  ]);
  function reload() {
    setLoading(true);
    setRefresh((v) => v + 1);
  }
  function filter(change: () => void) {
    change();
    setPage(1);
    setLoading(true);
  }
  function close() {
    if (!busy) {
      setPanel(null);
      setActionError("");
    }
  }
  function saved() {
    setPanel(null);
    setActionError("");
    setNotice("Expense saved.");
    reload();
  }
  async function show(
    row: ExpenseView,
    kind: "DETAIL" | "EDIT" | "PAY" | "ARCHIVE" | "RESTORE",
  ) {
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const fresh = await expenseFetch<ExpenseView>(
        `/api/v1/expenses/${row.id}`,
      );
      setPanel({ kind, row: fresh });
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not load expense.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirmArchive() {
    if (!panel || panel.kind === "CREATE" || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await expenseFetch(
        `/api/v1/expenses/${panel.row.id}${panel.kind === "RESTORE" ? "/restore" : ""}`,
        {
          method: panel.kind === "RESTORE" ? "POST" : "DELETE",
          body: JSON.stringify({ revision: panel.row.revision }),
        },
      );
      saved();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not update expense.",
      );
    } finally {
      setBusy(false);
    }
  }
  const date = (value: string | null) =>
    value ? formatEventTime(value, props.timezone) : "No deadline";
  return (
    <WorkspaceShell
      activePage="Expenses"
      weddingTitle={props.weddingTitle}
      memberName={props.memberName}
      roleLabel={props.roleLabel}
    >
      <div className={styles.page}>
        {!props.canView ? (
          <section className={styles.empty}>
            <ReceiptText aria-hidden="true" />
            <h1>Expenses access restricted</h1>
            <p>Your role does not have permission to view wedding finances.</p>
          </section>
        ) : (
          <>
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>
                  A clear view of your celebration
                </p>
                <h1>Expenses & Budget</h1>
                <p className={styles.muted}>
                  Keep estimates, agreed costs and recorded payments in one
                  private ledger.
                </p>
              </div>
              {props.canManage && (
                <button
                  className={styles.primary}
                  onClick={() => {
                    setPanel({ kind: "CREATE" });
                    setActionError("");
                  }}
                >
                  <Plus size={17} aria-hidden="true" />
                  Add expense
                </button>
              )}
            </header>
            {summary && !error && (
              <>
                <section
                  className={styles.stats}
                  aria-label="Wedding-wide expense totals"
                >
                  <div>
                    <span>Estimated</span>
                    <strong>{formatMoney(summary.estimated)}</strong>
                    <small>Tentative costs, not yet agreed</small>
                  </div>
                  <div>
                    <span>Committed · unpaid</span>
                    <strong>{formatMoney(summary.committed)}</strong>
                    <small>Agreed costs awaiting full payment</small>
                  </div>
                  <div>
                    <span>Paid to date</span>
                    <strong>{formatMoney(summary.paid)}</strong>
                    <small>Recorded payments made outside this app</small>
                  </div>
                  <div>
                    <span>Wedding budget</span>
                    <strong className={styles.unset}>Budget not set</strong>
                    <small>Budget editing is a later step</small>
                  </div>
                </section>
                <p className={styles.muted}>
                  {summary.active} active expenses · {summary.overdue} overdue
                  unpaid · {formatMoney(summary.recorded)} recorded across all
                  three states. Totals cover active expenses for this wedding,
                  independent of list filters.
                </p>
              </>
            )}
            <section className={styles.filters} aria-label="Expense filters">
              <label className={styles.field}>
                Search expenses
                <div className={styles.search}>
                  <Search size={16} aria-hidden="true" />
                  <input
                    value={search}
                    maxLength={180}
                    placeholder="Search by title"
                    onChange={(e) => filter(() => setSearch(e.target.value))}
                  />
                </div>
              </label>
              <label className={styles.field}>
                Category
                <input
                  list="expense-category-filter-suggestions"
                  placeholder="All categories, or type a category"
                  maxLength={80}
                  value={category}
                  onChange={(e) => filter(() => setCategory(e.target.value))}
                />
                <datalist id="expense-category-filter-suggestions">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={expenseLabel(c)} />
                  ))}
                </datalist>
              </label>
              <label className={styles.field}>
                Financial state
                <select
                  value={financialState}
                  onChange={(e) => filter(() => setState(e.target.value))}
                >
                  <option value="">All states</option>
                  {EXPENSE_STATES.map((s) => (
                    <option key={s} value={s}>
                      {expenseLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Event
                <select
                  value={eventId}
                  onChange={(e) => filter(() => setEventId(e.target.value))}
                >
                  <option value="">All events</option>
                  {Object.entries(eventChoices).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Records
                <select
                  value={status}
                  onChange={(e) => filter(() => setStatus(e.target.value))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className={styles.field}>
                Sort
                <select
                  value={sort}
                  onChange={(e) => filter(() => setSort(e.target.value))}
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="DUE">Due date first</option>
                  <option value="AMOUNT_DESC">Amount: high to low</option>
                  <option value="AMOUNT_ASC">Amount: low to high</option>
                  <option value="TITLE">Title</option>
                </select>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={overdue}
                  onChange={(e) => filter(() => setOverdue(e.target.checked))}
                />
                Overdue only
              </label>
            </section>
            {!props.canManage && (
              <p className={styles.notice}>
                You can view expenses
                {props.canPay ? " and record payments" : ""}. Expense editing is
                restricted by your role.
              </p>
            )}
            {notice && (
              <p role="status" className={styles.success}>
                {notice}
              </p>
            )}
            {actionError && !panel && (
              <p role="alert" className={styles.error}>
                {actionError}
              </p>
            )}
            {loading ? (
              <section className={styles.empty} role="status">
                Loading expenses…
              </section>
            ) : error ? (
              <section className={styles.empty} role="alert">
                <h2>We couldn’t load expenses</h2>
                <p>{error}</p>
                <button className={styles.secondary} onClick={reload}>
                  Retry expenses
                </button>
              </section>
            ) : !data?.expenses.length ? (
              <section className={styles.empty}>
                <ReceiptText size={30} aria-hidden="true" />
                <h2>
                  {search || category || financialState || eventId || overdue
                    ? "No matching expenses"
                    : status === "ARCHIVED"
                      ? "No archived expenses"
                      : "Start your wedding ledger"}
                </h2>
                <p>
                  Keep each wedding cost clear, from an initial estimate to its
                  final payment.
                </p>
                {props.canManage && status === "ACTIVE" && (
                  <button
                    className={styles.primary}
                    onClick={() => setPanel({ kind: "CREATE" })}
                  >
                    Add expense
                  </button>
                )}
              </section>
            ) : (
              <>
                <div className={styles.tableHead} aria-hidden="true">
                  <span>Expense / category</span>
                  <span>Amount</span>
                  <span>State / due date</span>
                  <span>Payer / actions</span>
                </div>
                <ul className={styles.ledger} aria-label="Expenses">
                  {data.expenses.map((row) => (
                    <li key={row.id} className={styles.row}>
                      <div>
                        <button
                          className={styles.titleButton}
                          onClick={() => show(row, "DETAIL")}
                          disabled={busy}
                        >
                          {row.title}
                        </button>
                        <p className={styles.muted}>
                          {categoryLabel(row.category)} ·{" "}
                          {row.eventName ?? "No event"}
                        </p>
                      </div>
                      <strong className={styles.amount}>
                        {formatMoney(row.amount)}
                      </strong>
                      <div>
                        <span
                          className={`${styles.badge} ${row.financialState === "PAID" ? styles.paid : row.financialState === "COMMITTED" ? styles.committed : ""}`}
                        >
                          {expenseLabel(row.financialState)}
                        </span>
                        <p className={styles.muted}>{date(row.dueAt)}</p>
                        {row.status === "ACTIVE" &&
                          row.financialState !== "PAID" &&
                          row.dueAt &&
                          row.dueAt < new Date().toISOString() && (
                            <span className={styles.overdue}>Overdue</span>
                          )}
                      </div>
                      <div>
                        <p className={styles.payer}>
                          {row.payment?.payerLabel ?? row.payerLabel}
                        </p>
                        <div className={styles.actions}>
                          <button
                            className={styles.secondary}
                            onClick={() => show(row, "DETAIL")}
                            disabled={busy}
                          >
                            Details
                          </button>
                          {row.status === "ACTIVE" &&
                            row.financialState !== "PAID" &&
                            props.canManage && (
                              <button
                                className={styles.secondary}
                                onClick={() => show(row, "EDIT")}
                                disabled={busy}
                              >
                                Edit
                              </button>
                            )}
                          {row.status === "ACTIVE" &&
                            row.financialState === "COMMITTED" &&
                            props.canPay && (
                              <button
                                className={styles.primary}
                                onClick={() => show(row, "PAY")}
                                disabled={busy}
                              >
                                Record payment
                              </button>
                            )}
                          {row.financialState !== "PAID" && props.canManage && (
                            <button
                              className={styles.secondary}
                              onClick={() =>
                                show(
                                  row,
                                  row.status === "ACTIVE"
                                    ? "ARCHIVE"
                                    : "RESTORE",
                                )
                              }
                              disabled={busy}
                            >
                              {row.status === "ACTIVE" ? "Archive" : "Restore"}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <nav className={styles.pager} aria-label="Expense pages">
                  <button
                    className={styles.secondary}
                    disabled={page === 1}
                    onClick={() => {
                      setPage((p) => p - 1);
                      setLoading(true);
                    }}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of{" "}
                    {Math.max(1, Math.ceil(data.total / data.limit))} ·{" "}
                    {data.total} matching
                  </span>
                  <button
                    className={styles.secondary}
                    disabled={page * data.limit >= data.total}
                    onClick={() => {
                      setPage((p) => p + 1);
                      setLoading(true);
                    }}
                  >
                    Next
                  </button>
                </nav>
              </>
            )}
            <p className={styles.footnote}>
              Amounts are INR · Times use {props.timezone}. This ledger records
              spending; it does not process payments. Paid records are protected
              from editing or archiving. Receipt uploads and partial payments
              are not part of this slice.
            </p>
          </>
        )}
        {panel?.kind === "CREATE" && (
          <ExpenseForm
            onClose={close}
            onSaved={saved}
            timezone={props.timezone}
          />
        )}
        {panel?.kind === "EDIT" && (
          <ExpenseForm
            row={panel.row}
            onClose={close}
            onSaved={saved}
            timezone={props.timezone}
          />
        )}
        {panel?.kind === "PAY" && (
          <PaymentForm
            row={panel.row}
            onClose={close}
            onSaved={saved}
            timezone={props.timezone}
          />
        )}
        {panel?.kind === "DETAIL" && (
          <ExpenseDialog title="Expense details" onClose={close}>
            <h3>{panel.row.title}</h3>
            <p className={styles.amount}>{formatMoney(panel.row.amount)}</p>
            <dl className={styles.details}>
              <dt>Category</dt>
              <dd>{categoryLabel(panel.row.category)}</dd>
              <dt>Financial state</dt>
              <dd>{expenseLabel(panel.row.financialState)}</dd>
              <dt>Records</dt>
              <dd>{expenseLabel(panel.row.status)}</dd>
              <dt>Event</dt>
              <dd>{panel.row.eventName ?? "No event"}</dd>
              <dt>Vendor</dt>
              <dd>{panel.row.vendorName ?? "No vendor"}</dd>
              <dt>Due</dt>
              <dd>{date(panel.row.dueAt)}</dd>
              <dt>Payer</dt>
              <dd>{panel.row.payment?.payerLabel ?? panel.row.payerLabel}</dd>
              <dt>Private notes</dt>
              <dd className={styles.notes}>{panel.row.notes || "No notes"}</dd>
            </dl>
            {panel.row.payment && (
              <section className={styles.payment}>
                <h3>Full payment recorded</h3>
                <p>
                  {formatMoney(panel.row.payment.amount)} ·{" "}
                  {expenseLabel(panel.row.payment.method)}
                </p>
                <p>Paid {date(panel.row.payment.paidAt)}</p>
                <p>Recorded {date(panel.row.payment.recordedAt)}</p>
                <p className={styles.notes}>
                  {panel.row.payment.notes || "No payment notes"}
                </p>
                <p className={styles.muted}>
                  This entry records a payment made outside the app. It is
                  protected from edits.
                </p>
              </section>
            )}
          </ExpenseDialog>
        )}
        {(panel?.kind === "ARCHIVE" || panel?.kind === "RESTORE") && (
          <ExpenseDialog
            title={
              panel.kind === "ARCHIVE" ? "Archive expense?" : "Restore expense?"
            }
            onClose={close}
            busy={busy}
          >
            <p>
              <strong>{panel.row.title}</strong>
            </p>
            <p>
              {panel.kind === "ARCHIVE"
                ? "The unpaid expense stays in history and is excluded from active totals. You can restore it later."
                : "The expense will return to the active ledger and its totals."}
            </p>
            {actionError && (
              <p className={styles.error} role="alert">
                {actionError}
              </p>
            )}
            <div className={styles.actions}>
              <button
                className={styles.primary}
                onClick={confirmArchive}
                disabled={busy}
              >
                {busy
                  ? "Saving…"
                  : panel.kind === "ARCHIVE"
                    ? "Confirm archive"
                    : "Confirm restore"}
              </button>
              <button
                className={styles.secondary}
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </ExpenseDialog>
        )}
      </div>
    </WorkspaceShell>
  );
}
