"use client";
import { useEffect, useState } from "react";
import { Plus, Store } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import {
  VENDOR_CATEGORIES,
  vendorLabel,
  type VendorList,
  type VendorDetail,
  type VendorView,
  type VendorOptions,
} from "../vendor.types";
import { formatMoney } from "@/modules/expenses/expense.money";
import { vendorFetch, VendorRequestError } from "./vendor-client";
import { VendorForm } from "./vendor-form";
import { VendorDialog } from "./vendor-dialog";
import styles from "./vendors.module.css";
type Props = {
  canView: boolean;
  canManage: boolean;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
};
type Panel =
  | { kind: "CREATE" }
  | { kind: "EDIT" | "DETAIL" | "ARCHIVE" | "RESTORE"; row: VendorDetail };
export function VendorsScreen(props: Props) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [eventId, setEventId] = useState(""),
    [status, setStatus] = useState("ACTIVE"),
    [sort, setSort] = useState("NAME"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<VendorList | null>(null),
    [options, setOptions] = useState<VendorOptions | null>(null),
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
      const query = new URLSearchParams({
        search,
        status,
        sort,
        page: String(page),
      });
      if (category) query.set("category", category);
      if (eventId) query.set("eventId", eventId);
      Promise.all([
        vendorFetch<VendorList>(`/api/v1/vendors?${query}`, {
          signal: controller.signal,
        }),
        vendorFetch<VendorOptions>("/api/v1/vendors/options", {
          signal: controller.signal,
        }),
      ])
        .then(([value, choices]) => {
          if (controller.signal.aborted) return;
          const last = Math.max(1, Math.ceil(value.total / value.limit));
          if (value.page > last) {
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
  }, [props.canView, search, category, eventId, status, sort, page, refresh]);
  function close() {
    setPanel(null);
    setActionError("");
    setStale(false);
    setRefresh((n) => n + 1);
  }
  function saved() {
    close();
    setNotice("Vendor saved.");
  }
  async function show(
    row: VendorView,
    kind: "DETAIL" | "EDIT" | "ARCHIVE" | "RESTORE",
  ) {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setStale(false);
    try {
      const value = await vendorFetch<VendorDetail>(
        `/api/v1/vendors/${row.id}`,
      );
      setPanel({ kind, row: value });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not load vendor.");
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (!panel || panel.kind === "CREATE" || busy || stale) return;
    setBusy(true);
    setActionError("");
    const restore = panel.kind === "RESTORE";
    try {
      await vendorFetch(
        `/api/v1/vendors/${panel.row.id}${restore ? "/restore" : ""}`,
        {
          method: restore ? "POST" : "DELETE",
          body: JSON.stringify({ revision: panel.row.revision }),
        },
      );
      close();
      setNotice(
        restore
          ? "Vendor restored."
          : "Vendor archived. Existing expense links are retained.",
      );
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not update vendor.",
      );
      if (e instanceof VendorRequestError && e.code === "CONFLICT")
        setStale(true);
    } finally {
      setBusy(false);
    }
  }
  const filtered = Boolean(
    search || category || eventId || status !== "ACTIVE",
  );
  return (
    <WorkspaceShell
      activePage="Vendors"
      weddingTitle={props.weddingTitle}
      memberName={props.memberName}
      roleLabel={props.roleLabel}
    >
      <section className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>The people behind your celebration</p>
            <h1>Vendors & Suppliers</h1>
            <p className={styles.muted}>
              Keep your wedding suppliers, contacts and services together.
            </p>
          </div>
          {props.canView && props.canManage ? (
            <button
              className={styles.primary}
              onClick={() => {
                setActionError("");
                setPanel({ kind: "CREATE" });
              }}
            >
              <Plus size={16} aria-hidden="true" />
              Add vendor
            </button>
          ) : null}
        </header>
        {!props.canView ? (
          <div className={styles.empty}>
            <Store aria-hidden="true" />
            <h2>Vendor access is restricted</h2>
            <p>Your account cannot view the wedding vendor directory.</p>
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
            <div className={styles.filters}>
              <label className={styles.field}>
                Search vendors
                <input
                  value={search}
                  placeholder="Name or contact"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  maxLength={180}
                />
              </label>
              <label className={styles.field}>
                Category
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {vendorLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Event
                <select
                  value={eventId}
                  onChange={(e) => {
                    setEventId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All events</option>
                  {options?.events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Records
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className={styles.field}>
                Sort
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="NAME">Name</option>
                  <option value="NEWEST">Newest first</option>
                </select>
              </label>
            </div>
            {loading ? (
              <p role="status" className={styles.empty}>
                Loading vendors…
              </p>
            ) : error ? (
              <div role="alert" className={styles.empty}>
                <p>{error}</p>
                <button
                  className={styles.secondary}
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  Retry vendors
                </button>
              </div>
            ) : data?.vendors.length ? (
              <>
                <p className={styles.muted}>
                  {data.total} matching {status.toLowerCase()}{" "}
                  {data.total === 1 ? "vendor" : "vendors"}
                </p>
                <div className={styles.tableHead} aria-hidden="true">
                  <span>Vendor / category</span>
                  <span>Contact</span>
                  <span>Assigned events</span>
                  <span>Actions</span>
                </div>
                <ul className={styles.ledger} aria-label="Vendors">
                  {data.vendors.map((row) => (
                    <li key={row.id} className={styles.row}>
                      <div>
                        <button
                          className={styles.titleButton}
                          disabled={busy}
                          onClick={() => show(row, "DETAIL")}
                        >
                          {row.name}
                        </button>
                        <p>
                          <span className={styles.badge}>
                            {vendorLabel(row.category)}
                          </span>
                          {row.status === "ARCHIVED" ? (
                            <span className={styles.badge}>Archived</span>
                          ) : null}
                        </p>
                      </div>
                      <div className={styles.contact}>
                        <p>{row.contact.personName || "No contact person"}</p>
                        <p>{row.contact.phone || "No phone"}</p>
                        <p>{row.contact.email || "No email"}</p>
                      </div>
                      <div className={styles.contact}>
                        {row.events.length ? (
                          row.events.map((e) => <p key={e.id}>{e.name}</p>)
                        ) : (
                          <p>No assigned events</p>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() => show(row, "DETAIL")}
                        >
                          Details
                        </button>
                        {props.canManage ? (
                          <>
                            {row.status === "ACTIVE" ? (
                              <>
                                <button
                                  className={styles.secondary}
                                  disabled={busy}
                                  onClick={() => show(row, "EDIT")}
                                >
                                  Edit
                                </button>
                                <button
                                  className={styles.secondary}
                                  disabled={busy}
                                  onClick={() => show(row, "ARCHIVE")}
                                >
                                  Archive
                                </button>
                              </>
                            ) : (
                              <button
                                className={styles.secondary}
                                disabled={busy}
                                onClick={() => show(row, "RESTORE")}
                              >
                                Restore
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                <nav className={styles.pager} aria-label="Vendor pages">
                  <button
                    className={styles.secondary}
                    disabled={page === 1 || loading}
                    onClick={() => setPage((n) => n - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {data.page} of{" "}
                    {Math.max(1, Math.ceil(data.total / data.limit))}
                  </span>
                  <button
                    className={styles.secondary}
                    disabled={data.page * data.limit >= data.total || loading}
                    onClick={() => setPage((n) => n + 1)}
                  >
                    Next
                  </button>
                </nav>
              </>
            ) : (
              <div className={styles.empty}>
                <Store size={32} aria-hidden="true" />
                <h2>
                  {filtered
                    ? "No vendors match"
                    : "Your trusted team starts here"}
                </h2>
                <p>
                  {filtered
                    ? "Try changing your filters."
                    : "Add your first supplier and keep their details in one private place."}
                </p>
                {filtered ? (
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      setSearch("");
                      setCategory("");
                      setEventId("");
                      setStatus("ACTIVE");
                      setPage(1);
                    }}
                  >
                    Reset filters
                  </button>
                ) : props.canManage ? (
                  <button
                    className={styles.primary}
                    onClick={() => setPanel({ kind: "CREATE" })}
                  >
                    Add vendor
                  </button>
                ) : null}
              </div>
            )}
            <p className={styles.footnote}>
              Supplier records are private to authorized wedding members. Linked
              expense totals describe recorded spending; they are not contract
              balances. Adding a vendor sends no invitation.
            </p>
          </>
        )}
        {panel?.kind === "CREATE" ? (
          <VendorForm onClose={close} onSaved={saved} />
        ) : panel?.kind === "EDIT" ? (
          <VendorForm row={panel.row} onClose={close} onSaved={saved} />
        ) : panel?.kind === "DETAIL" ? (
          <VendorDialog title={panel.row.name} onClose={close}>
            <span className={styles.badge}>
              {vendorLabel(panel.row.category)}
            </span>
            <span className={styles.badge}>
              {vendorLabel(panel.row.status)}
            </span>
            <dl className={styles.details}>
              <dt>Contact person</dt>
              <dd>{panel.row.contact.personName || "Not specified"}</dd>
              <dt>Phone</dt>
              <dd>{panel.row.contact.phone || "Not specified"}</dd>
              <dt>Email</dt>
              <dd>{panel.row.contact.email || "Not specified"}</dd>
              <dt>Service</dt>
              <dd>{panel.row.service || "Not specified"}</dd>
              <dt>Events</dt>
              <dd>
                {panel.row.events.map((e) => e.name).join(", ") ||
                  "No assigned events"}
              </dd>
              <dt>Private notes</dt>
              <dd>{panel.row.notes || "No notes"}</dd>
            </dl>
            {panel.row.financials ? (
              <section className={styles.financials}>
                <h3>Linked expense totals</h3>
                <p className={styles.muted}>
                  Active expense records only. This is not a contract balance.
                </p>
                {panel.row.financials.count ? (
                  <dl className={styles.details}>
                    <dt>Estimated</dt>
                    <dd>{formatMoney(panel.row.financials.estimated)}</dd>
                    <dt>Committed · unpaid</dt>
                    <dd>{formatMoney(panel.row.financials.committed)}</dd>
                    <dt>Paid</dt>
                    <dd>{formatMoney(panel.row.financials.paid)}</dd>
                  </dl>
                ) : (
                  <p>No linked expenses yet.</p>
                )}
              </section>
            ) : null}
            {props.canManage ? (
              <div className={styles.actions}>
                {panel.row.status === "ACTIVE" ? (
                  <>
                    <button
                      className={styles.primary}
                      onClick={() => setPanel({ kind: "EDIT", row: panel.row })}
                    >
                      Edit vendor
                    </button>
                    <button
                      className={styles.secondary}
                      onClick={() =>
                        setPanel({ kind: "ARCHIVE", row: panel.row })
                      }
                    >
                      Archive vendor
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.secondary}
                    onClick={() =>
                      setPanel({ kind: "RESTORE", row: panel.row })
                    }
                  >
                    Restore vendor
                  </button>
                )}
              </div>
            ) : null}
          </VendorDialog>
        ) : panel ? (
          <VendorDialog
            title={
              panel.kind === "RESTORE" ? "Restore vendor?" : "Archive vendor?"
            }
            onClose={close}
            busy={busy}
          >
            <p className={styles.muted}>{panel.row.name}</p>
            <p>
              {panel.kind === "RESTORE"
                ? "This vendor will be available for new expense links. Existing payments stay unchanged."
                : "This vendor will be hidden from active lists and new expense choices. Existing expense links and history stay intact."}
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
                onClick={archive}
              >
                {busy
                  ? "Saving…"
                  : panel.kind === "RESTORE"
                    ? "Confirm restore"
                    : "Confirm archive"}
              </button>
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={close}
              >
                {stale ? "Close and reload" : "Cancel"}
              </button>
            </div>
          </VendorDialog>
        ) : null}
      </section>
    </WorkspaceShell>
  );
}
