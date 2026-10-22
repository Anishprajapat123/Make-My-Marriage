"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  expenseLabel,
  categoryLabel,
  type ExpenseView,
  type ExpenseOptions,
} from "../expense.types";
import { localParts } from "@/lib/date/time";
import { formatMoney } from "../expense.money";
import { expenseFetch, ExpenseRequestError } from "./expense-client";
import { ExpenseDialog } from "./expense-dialog";
import styles from "./expenses.module.css";
type Base = { onClose: () => void; onSaved: () => void; timezone: string };
export function ExpenseForm({
  row,
  onClose,
  onSaved,
  timezone,
}: Base & { row?: ExpenseView }) {
  const [options, setOptions] = useState<ExpenseOptions | null>(null),
    [optionError, setOptionError] = useState(""),
    [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  const [payer, setPayer] = useState(
    row?.paidByMemberId ? "MEMBER" : row?.paidByName ? "EXTERNAL" : "NONE",
  );
  const [vendorId, setVendorId] = useState(row?.vendorId ?? "");
  const [eventId, setEventId] = useState(row?.eventId ?? "");
  const [paidByMemberId, setPaidByMemberId] = useState(
    row?.paidByMemberId ?? "",
  );
  const request = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    expenseFetch<ExpenseOptions>("/api/v1/expenses/options", {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) {
          setOptions(value);
          setOptionError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setOptionError(e.message);
      });
    return () => controller.abort();
  }, [retry]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || stale || !options) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input = {
      title: String(form.get("title") ?? ""),
      amount: String(form.get("amount") ?? ""),
      category: String(form.get("category")),
      financialState: String(form.get("financialState")),
      eventId: form.get("eventId") || null,
      vendorId: form.get("vendorId") || null,
      paidByMemberId:
        payer === "MEMBER" ? form.get("paidByMemberId") || null : null,
      paidByName:
        payer === "EXTERNAL" ? String(form.get("paidByName") ?? "") : "",
      dueLocal: form.get("dueLocal") || null,
      notes: String(form.get("notes") ?? ""),
    };
    const signature = JSON.stringify(input);
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    try {
      await expenseFetch(
        row ? `/api/v1/expenses/${row.id}` : "/api/v1/expenses",
        {
          method: row ? "PATCH" : "POST",
          body: JSON.stringify(
            row
              ? { revision: row.revision, expense: input }
              : { requestId: request.current!.id, expense: input },
          ),
        },
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save expense.");
      if (e instanceof ExpenseRequestError && e.code === "CONFLICT")
        setStale(true);
    } finally {
      setBusy(false);
    }
  }
  const due = row?.dueAt ? localParts(row.dueAt, timezone) : null;
  return (
    <ExpenseDialog
      title={row ? "Edit expense" : "Add expense"}
      onClose={onClose}
      busy={busy}
    >
      <p className={styles.muted}>
        Amounts are in INR. Optional dates use {timezone}.
      </p>
      {optionError ? (
        <p role="alert" className={styles.error}>
          {optionError}{" "}
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setRetry((v) => v + 1)}
          >
            Retry choices
          </button>
        </p>
      ) : !options ? (
        <p role="status">Loading event and payer choices…</p>
      ) : null}
      <form onSubmit={save}>
        <fieldset disabled={busy} className={styles.fieldset}>
          <label className={styles.field}>
            Expense title
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={row?.title ?? ""}
              autoFocus
            />
          </label>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Amount (INR)
              <input
                name="amount"
                inputMode="decimal"
                required
                maxLength={15}
                placeholder="0.00"
                defaultValue={row?.amount ?? ""}
              />
            </label>
            <label className={styles.field}>
              Category
              <input
                name="category"
                list="expense-category-suggestions"
                required
                maxLength={80}
                placeholder="Choose a suggestion or type your own"
                defaultValue={row ? categoryLabel(row.category) : ""}
                aria-describedby="expense-category-help"
              />
              <datalist id="expense-category-suggestions">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option value={expenseLabel(c)} key={c} />
                ))}
              </datalist>
              <small id="expense-category-help">
                Your custom category is saved on this expense only.
              </small>
            </label>
            <label className={styles.field}>
              Financial state
              <select
                name="financialState"
                defaultValue={row?.financialState ?? "ESTIMATED"}
              >
                <option value="ESTIMATED">Estimated</option>
                <option value="COMMITTED">Committed</option>
              </select>
            </label>
          </div>
          <p className={styles.muted}>
            Estimated is a tentative cost. Committed is an agreed cost. Record a
            full payment separately to mark it Paid.
          </p>
          <details className={styles.optional} open={Boolean(row)}>
            <summary>Optional details</summary>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                Vendor
                <select
                  name="vendorId"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                >
                  <option value="">No vendor</option>
                  {row?.vendorId &&
                    !options?.vendors.some((v) => v.id === row.vendorId) && (
                      <option value={row.vendorId}>
                        {row.vendorName ?? "Linked vendor"} (previous selection)
                      </option>
                    )}
                  {options?.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <small>
                  {options?.vendors.length === 0
                    ? "No active vendors yet. You can save without one."
                    : "Only active vendors are available for new links."}
                </small>
              </label>
              <label className={styles.field}>
                Event
                <select
                  name="eventId"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value="">No event</option>
                  {row?.eventId &&
                    !options?.events.some((e) => e.id === row.eventId) && (
                      <option value={row.eventId}>
                        {row.eventName} (previous selection)
                      </option>
                    )}
                  {options?.events.map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Due date and time
                <input
                  type="datetime-local"
                  name="dueLocal"
                  defaultValue={due ? `${due.date}T${due.time}` : ""}
                />
              </label>
              <label className={styles.field}>
                Payer type
                <select
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                >
                  <option value="NONE">Not specified</option>
                  <option value="MEMBER">Wedding member</option>
                  <option value="EXTERNAL">Someone else</option>
                </select>
              </label>
              {payer === "MEMBER" && (
                <label className={styles.field}>
                  Paid by member
                  <select
                    name="paidByMemberId"
                    required
                    value={paidByMemberId}
                    onChange={(e) => setPaidByMemberId(e.target.value)}
                  >
                    <option value="">Choose member</option>
                    {row?.paidByMemberId &&
                      !options?.members.some(
                        (m) => m.id === row.paidByMemberId,
                      ) && (
                        <option value={row.paidByMemberId}>
                          {row.payerLabel} (no longer active)
                        </option>
                      )}
                    {options?.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {payer === "EXTERNAL" && (
                <label className={styles.field}>
                  External payer name
                  <input
                    name="paidByName"
                    required
                    maxLength={120}
                    defaultValue={row?.paidByName ?? ""}
                  />
                </label>
              )}
            </div>
            <label className={styles.field}>
              Private notes
              <textarea
                name="notes"
                maxLength={2000}
                rows={3}
                defaultValue={row?.notes ?? ""}
              />
            </label>
          </details>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {stale && (
            <p className={styles.muted}>
              Close this form and reload the expense to use its latest version.
              Your unsaved values remain visible here.
            </p>
          )}
          <div className={styles.actions}>
            <button
              className={styles.primary}
              type="submit"
              disabled={!options || stale}
            >
              {busy ? "Saving…" : "Save expense"}
            </button>
            <button
              className={styles.secondary}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
    </ExpenseDialog>
  );
}
export function PaymentForm({
  row,
  onClose,
  onSaved,
  timezone,
}: Base & { row: ExpenseView }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const now = localParts(new Date().toISOString(), timezone);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || stale) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const fields = {
      revision: row.revision,
      amount: row.amount,
      paidLocal: String(form.get("paidLocal")),
      method: String(form.get("method")),
      notes: String(form.get("notes") ?? ""),
    };
    const signature = JSON.stringify(fields);
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    try {
      await expenseFetch(`/api/v1/expenses/${row.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ ...fields, requestId: request.current!.id }),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
      if (e instanceof ExpenseRequestError && e.code === "CONFLICT")
        setStale(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ExpenseDialog title="Record full payment" onClose={onClose} busy={busy}>
      <p className={styles.notice}>
        Only record money already paid outside this app. This action transfers
        no money. Once recorded, this expense and payment cannot be edited in
        this slice.
      </p>
      <p>
        <strong>{row.title}</strong>
        <br />
        Full payment: <strong>{formatMoney(row.amount)}</strong>
        <br />
        Payer: {row.payerLabel}
      </p>
      <form onSubmit={save}>
        <fieldset disabled={busy} className={styles.fieldset}>
          <label className={styles.field}>
            Payment date and time ({timezone})
            <input
              type="datetime-local"
              name="paidLocal"
              required
              defaultValue={`${now.date}T${now.time}`}
            />
          </label>
          <label className={styles.field}>
            Payment method
            <select name="method" defaultValue="BANK_TRANSFER">
              {PAYMENT_METHODS.map((m) => (
                <option value={m} key={m}>
                  {expenseLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Payment notes
            <textarea name="notes" maxLength={1000} rows={3} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" required />I confirm this full amount has
            already been paid.
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {stale && <p>Close and reload the expense before continuing.</p>}
          <div className={styles.actions}>
            <button className={styles.primary} type="submit" disabled={stale}>
              {busy ? "Recording…" : "Confirm full payment"}
            </button>
            <button
              className={styles.secondary}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
    </ExpenseDialog>
  );
}
