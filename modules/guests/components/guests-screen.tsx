"use client";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  UsersRound,
  ArrowLeft,
  Search,
  Archive,
  RotateCcw,
} from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import type {
  GuestList,
  FamilyList,
  GuestView,
  FamilyView,
} from "../guest.types";
import { GUEST_SIDES } from "../guest.types";
import { GuestForm, FamilyForm } from "./guest-forms";
import {
  guestFetch,
  Pager,
  ReferencePicker,
  sideLabels,
  typeLabels,
} from "./guest-ui";
import styles from "./guests.module.css";
type Props = {
  canView: boolean;
  canManage: boolean;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
};
type Editor =
  | { kind: "guest"; guest?: GuestView; family?: { id: string; name: string } }
  | { kind: "family"; family?: FamilyView };
const initial = {
  search: "",
  status: "ACTIVE",
  side: "",
  relationship: "",
  familyId: null as string | null,
  sort: "name:asc",
};
export function GuestsScreen(props: Props) {
  const [tab, setTab] = useState<"guests" | "families">("guests"),
    [filters, setFilters] = useState(initial),
    [familyLabel, setFamilyLabel] = useState<string | null>(null),
    [familySearch, setFamilySearch] = useState(""),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<GuestList | null>(null),
    [families, setFamilies] = useState<FamilyList | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [detail, setDetail] = useState<GuestView | null>(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<
    | { kind: "archive" | "restore"; guest: GuestView }
    | { kind: "family"; family: FamilyView }
    | null
  >(null);
  const focus = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (editor || detail || confirmation) focus.current?.focus();
  }, [editor, detail, confirmation]);
  useEffect(() => {
    if (!props.canView) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const [sortBy, sortOrder] = filters.sort.split(":");
      const query = new URLSearchParams({
        search: filters.search,
        status: filters.status,
        page: String(tab === "guests" ? page : 1),
        limit: tab === "guests" ? "25" : "1",
        sortBy,
        sortOrder,
      });
      if (filters.familyId) query.set("familyId", filters.familyId);
      if (filters.side) query.set("side", filters.side);
      if (filters.relationship) query.set("relationship", filters.relationship);
      const load = async () => {
        const guests = await guestFetch<GuestList>(`/api/v1/guests?${query}`, {
          signal: controller.signal,
        });
        const groups =
          tab === "families"
            ? await guestFetch<FamilyList>(
                `/api/v1/families?${new URLSearchParams({ search: familySearch, page: String(page), limit: "25" })}`,
                { signal: controller.signal },
              )
            : null;
        if (!controller.signal.aborted) {
          setData(guests);
          if (groups) setFamilies(groups);
        }
      };
      load()
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [props.canView, filters, familySearch, tab, page, refresh]);
  function reload() {
    setLoading(true);
    setRefresh((v) => v + 1);
  }
  function filter<K extends keyof typeof initial>(
    key: K,
    value: (typeof initial)[K],
  ) {
    setPage(1);
    setLoading(true);
    setFilters((f) => ({ ...f, [key]: value }));
  }
  function openEditor(value: Editor) {
    setEditor(value);
    setDetail(null);
    setActionError("");
    setNotice("");
    setConfirmation(null);
  }
  async function showGuest(id: string) {
    setBusy(true);
    setActionError("");
    try {
      const r = await guestFetch<{ guest: GuestView }>(`/api/v1/guests/${id}`);
      setDetail(r.guest);
      setEditor(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not load guest.");
    } finally {
      setBusy(false);
    }
  }
  function viewFamily(id: string | null, name: string | null) {
    setTab("guests");
    setPage(1);
    setFilters({ ...initial, familyId: id ?? "UNGROUPED", status: "ALL" });
    setFamilyLabel(name ?? "Ungrouped guests");
    setLoading(true);
    setDetail(null);
    setEditor(null);
  }
  async function confirm() {
    if (!confirmation || busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (confirmation.kind === "family")
        await guestFetch(`/api/v1/families/${confirmation.family.id}`, {
          method: "DELETE",
          body: JSON.stringify({ revision: confirmation.family.revision }),
        });
      else {
        const g = confirmation.guest;
        await guestFetch(
          `/api/v1/guests/${g.id}${confirmation.kind === "restore" ? "/restore" : ""}`,
          {
            method: confirmation.kind === "restore" ? "POST" : "DELETE",
            body: JSON.stringify({
              revision: g.revision,
              ...(confirmation.kind === "restore" ? { action: "RESTORE" } : {}),
            }),
          },
        );
      }
      setNotice(
        confirmation.kind === "family"
          ? "Empty family deleted."
          : confirmation.kind === "restore"
            ? "Guest restored."
            : "Guest archived. You can restore them from Archived guests.",
      );
      setConfirmation(null);
      setDetail(null);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not save change.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <WorkspaceShell
      activePage="Guests"
      weddingTitle={props.weddingTitle}
      memberName={props.memberName}
      roleLabel={props.roleLabel}
    >
      <div className={styles.page}>
        {!props.canView ? (
          <section className={styles.empty}>
            <h1>Guests access restricted</h1>
            <p>Ask your wedding owner for guest access.</p>
            <a className={styles.secondary} href="/dashboard">
              Back to dashboard
            </a>
          </section>
        ) : (
          <>
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>
                  People at the heart of your day
                </p>
                <h1>Guests & families</h1>
                <p className={styles.muted}>
                  Every person remembered. Every household brought together.
                </p>
              </div>
              {props.canManage && (
                <div className={styles.actions}>
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => openEditor({ kind: "family" })}
                  >
                    Create family
                  </button>
                  <button
                    className={styles.primary}
                    disabled={busy}
                    onClick={() => openEditor({ kind: "guest" })}
                  >
                    <Plus size={18} aria-hidden /> Add guest
                  </button>
                </div>
              )}
            </header>
            {data && !error && (
              <section
                className={styles.stats}
                aria-label="Wedding guest counts"
              >
                <div>
                  <span>Active guests</span>
                  <strong>{data.counts.active}</strong>
                  <small>Individual people</small>
                </div>
                <div>
                  <span>Families</span>
                  <strong>{data.counts.families}</strong>
                  <small>Households, together</small>
                </div>
                <div>
                  <span>Ungrouped</span>
                  <strong>{data.counts.ungrouped}</strong>
                  <small>Active guests without a family</small>
                </div>
                <div>
                  <span>Archived</span>
                  <strong>{data.counts.archived}</strong>
                  <small>Retained for your records</small>
                </div>
              </section>
            )}
            {!props.canManage && (
              <p className={styles.readonly}>
                You have read-only guest access. Ask a planner to add or change
                records.
              </p>
            )}
            {notice && (
              <p className={styles.success} role="status">
                {notice}
              </p>
            )}
            {actionError && (
              <div className={styles.alert} role="alert">
                {actionError}
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => {
                    setEditor(null);
                    setDetail(null);
                    setConfirmation(null);
                    setActionError("");
                    reload();
                  }}
                >
                  Reload records / discard edits
                </button>
              </div>
            )}
            {editor?.kind === "guest" && (
              <GuestForm
                key={
                  editor.guest?.id ?? `new:${editor.family?.id ?? "ungrouped"}`
                }
                guest={editor.guest}
                initialFamily={editor.family}
                onCancel={() => {
                  setEditor(null);
                  reload();
                }}
                onSaved={(id) => {
                  setEditor(null);
                  setNotice("Guest saved.");
                  reload();
                  void showGuest(id);
                }}
              />
            )}
            {editor?.kind === "family" && (
              <FamilyForm
                key={editor.family?.id ?? "new-family"}
                family={editor.family}
                onCancel={() => {
                  setEditor(null);
                  reload();
                }}
                onSaved={() => {
                  setEditor(null);
                  setNotice("Family saved.");
                  reload();
                }}
              />
            )}
            {detail && (
              <section className={styles.panel}>
                <div className={styles.header}>
                  <h2 ref={focus} tabIndex={-1}>
                    {detail.name}
                  </h2>
                  <button
                    className={styles.secondary}
                    onClick={() => setDetail(null)}
                  >
                    <ArrowLeft size={16} aria-hidden /> Back to list
                  </button>
                </div>
                <div className={styles.badges}>
                  <span className={styles.badge}>
                    {detail.status.toLowerCase()}
                  </span>
                  <span className={styles.badge}>
                    {typeLabels[detail.guestType]}
                  </span>
                  <span className={styles.badge}>
                    {sideLabels[detail.side]}
                  </span>
                </div>
                <dl className={styles.meta}>
                  <div>
                    <dt>Phone</dt>
                    <dd>{detail.phone ?? "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{detail.email ?? "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Relationship</dt>
                    <dd>{detail.relationship || "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Family</dt>
                    <dd>{detail.familyName ?? "Ungrouped"}</dd>
                  </div>
                  <div className={styles.full}>
                    <dt>Private notes</dt>
                    <dd className={styles.notes}>
                      {detail.notes || "No notes added"}
                    </dd>
                  </div>
                </dl>
                <div className={styles.actions}>
                  {detail.familyId && (
                    <button
                      className={styles.secondary}
                      onClick={() =>
                        viewFamily(detail.familyId, detail.familyName)
                      }
                    >
                      View family guests
                    </button>
                  )}
                  {props.canManage &&
                    (detail.status === "ACTIVE" ? (
                      <>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() =>
                            openEditor({ kind: "guest", guest: detail })
                          }
                        >
                          Edit guest
                        </button>
                        <button
                          className={styles.danger}
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({ kind: "archive", guest: detail })
                          }
                        >
                          <Archive size={16} aria-hidden /> Archive guest
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.primary}
                        disabled={busy}
                        onClick={() =>
                          setConfirmation({ kind: "restore", guest: detail })
                        }
                      >
                        <RotateCcw size={16} aria-hidden /> Restore guest
                      </button>
                    ))}
                </div>
              </section>
            )}
            {confirmation && (
              <section
                className={styles.confirm}
                aria-label="Confirm record change"
              >
                <h2 ref={focus} tabIndex={-1}>
                  {confirmation.kind === "family"
                    ? `Delete ${confirmation.family.name}?`
                    : confirmation.kind === "archive"
                      ? `Archive ${confirmation.guest.name}?`
                      : `Restore ${confirmation.guest.name}?`}
                </h2>
                <p>
                  {confirmation.kind === "archive"
                    ? "This guest leaves the active list. Their record and family association are retained. If they are the family primary contact, that selection will be cleared."
                    : confirmation.kind === "family"
                      ? "Only an empty family can be deleted. Archived guests must also be reassigned first. Guest records will not be deleted."
                      : "This guest returns to the active list. A previous primary-contact selection is not automatically restored."}
                </p>
                <div className={styles.actions}>
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => setConfirmation(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className={
                      confirmation.kind === "restore"
                        ? styles.primary
                        : styles.danger
                    }
                    disabled={busy}
                    onClick={confirm}
                  >
                    {busy ? "Saving…" : "Confirm"}
                  </button>
                </div>
              </section>
            )}
            <nav className={styles.tabs} aria-label="Guest sections">
              {(["guests", "families"] as const).map((t) => (
                <button
                  key={t}
                  className={`${styles.tab} ${tab === t ? styles.activeTab : ""}`}
                  aria-pressed={tab === t}
                  onClick={() => {
                    if (tab === t) return;
                    setTab(t);
                    setPage(1);
                    setLoading(true);
                  }}
                >
                  {t === "guests" ? "Guest ledger" : "Family households"}
                </button>
              ))}
            </nav>
            {tab === "guests" ? (
              <section className={styles.filters} aria-label="Filter guests">
                <div className={styles.filterGrid}>
                  <label className={styles.field}>
                    <span>
                      <Search size={14} aria-hidden /> Search guests
                    </span>
                    <input
                      type="search"
                      placeholder="Name, phone or email"
                      maxLength={180}
                      value={filters.search}
                      onChange={(e) => filter("search", e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    Status
                    <select
                      value={filters.status}
                      onChange={(e) => filter("status", e.target.value)}
                    >
                      <option value="ACTIVE">Active guests</option>
                      <option value="ARCHIVED">Archived guests</option>
                      <option value="ALL">All records</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    Side
                    <select
                      value={filters.side}
                      onChange={(e) => filter("side", e.target.value)}
                    >
                      <option value="">All sides</option>
                      {GUEST_SIDES.map((s) => (
                        <option key={s} value={s}>
                          {sideLabels[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Relationship
                    <input
                      maxLength={120}
                      placeholder="e.g. Cousin"
                      value={filters.relationship}
                      onChange={(e) => filter("relationship", e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    Sort
                    <select
                      value={filters.sort}
                      onChange={(e) => filter("sort", e.target.value)}
                    >
                      <option value="name:asc">Name A–Z</option>
                      <option value="name:desc">Name Z–A</option>
                      <option value="createdAt:desc">Newest first</option>
                      <option value="createdAt:asc">Oldest first</option>
                    </select>
                  </label>
                </div>
                <div className={styles.filterFooter}>
                  <ReferencePicker
                    kind="family"
                    selectedId={filters.familyId}
                    selectedLabel={familyLabel}
                    onChange={(id, label) => {
                      filter("familyId", id);
                      setFamilyLabel(label);
                    }}
                  />
                  <button
                    className={styles.secondary}
                    onClick={() => viewFamily(null, null)}
                  >
                    Ungrouped guests
                  </button>
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      setFilters(initial);
                      setFamilyLabel(null);
                      setPage(1);
                      reload();
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </section>
            ) : (
              <section className={styles.filters}>
                <label className={styles.field}>
                  Search families
                  <input
                    type="search"
                    placeholder="Family name"
                    maxLength={180}
                    value={familySearch}
                    onChange={(e) => {
                      setFamilySearch(e.target.value);
                      setPage(1);
                      setLoading(true);
                    }}
                  />
                </label>
              </section>
            )}
            {loading ? (
              <section className={styles.empty} role="status">
                Loading your {tab}…
              </section>
            ) : error ? (
              <section className={styles.empty}>
                <h2>We couldn’t load {tab}</h2>
                <p role="alert">{error}</p>
                <button className={styles.primary} onClick={reload}>
                  Try again
                </button>
              </section>
            ) : tab === "guests" ? (
              <>
                <p className={styles.muted}>
                  {data?.total ?? 0} matching guests · each row is one person
                </p>
                {!data?.guests.length ? (
                  <section className={styles.empty}>
                    <UsersRound size={32} aria-hidden />
                    <h2>
                      {data?.counts.active || data?.counts.archived
                        ? "No matching guests"
                        : "Make room for your people"}
                    </h2>
                    <p>
                      {data?.counts.active || data?.counts.archived
                        ? "Try changing your search or filters."
                        : "Start with one guest, then bring their family together."}
                    </p>
                    {props.canManage && (
                      <button
                        className={styles.primary}
                        onClick={() => openEditor({ kind: "guest" })}
                      >
                        Add a guest
                      </button>
                    )}
                  </section>
                ) : (
                  <div className={styles.ledger}>
                    <div className={styles.tableHead}>
                      <span>Guest & relationship</span>
                      <span>Contact</span>
                      <span>Family & side</span>
                      <span>Actions</span>
                    </div>
                    {data.guests.map((g) => (
                      <article className={styles.row} key={g.id}>
                        <div className={styles.person}>
                          <span className={styles.avatar} aria-hidden>
                            {g.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <strong>{g.name}</strong>
                            <p className={styles.muted}>
                              {g.relationship || typeLabels[g.guestType]}
                            </p>
                            {g.status === "ARCHIVED" && (
                              <span className={styles.badge}>Archived</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.contact}>
                          <span>{g.phone ?? "No phone"}</span>
                          <span>{g.email ?? "No email"}</span>
                        </div>
                        <div>
                          <span className={styles.badge}>
                            {g.familyName ?? "Ungrouped"}
                          </span>
                          <p className={styles.muted}>{sideLabels[g.side]}</p>
                        </div>
                        <div className={styles.actions}>
                          <button
                            className={styles.secondary}
                            disabled={busy}
                            aria-label={`View ${g.name}`}
                            onClick={() => showGuest(g.id)}
                          >
                            View
                          </button>
                          {props.canManage && g.status === "ACTIVE" && (
                            <button
                              className={styles.secondary}
                              disabled={busy}
                              aria-label={`Edit ${g.name}`}
                              onClick={() =>
                                openEditor({ kind: "guest", guest: g })
                              }
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <Pager
                  page={page}
                  total={data?.total ?? 0}
                  busy={loading}
                  onPage={(p) => {
                    setPage(p);
                    setLoading(true);
                  }}
                />
              </>
            ) : (
              <>
                <button
                  className={styles.ungrouped}
                  onClick={() => viewFamily(null, null)}
                >
                  <UsersRound size={22} aria-hidden />
                  <span>
                    <strong>Ungrouped guests</strong>
                    <small>
                      {data?.counts.ungrouped ?? 0} active guests · view all
                      ungrouped records
                    </small>
                  </span>
                  <span aria-hidden>→</span>
                </button>
                {!families?.families.length ? (
                  <section className={styles.empty}>
                    <h2>
                      {familySearch
                        ? "No matching families"
                        : "Bring your guests together"}
                    </h2>
                    <p>Families are optional. Guests can stay ungrouped.</p>
                    {props.canManage && (
                      <button
                        className={styles.primary}
                        onClick={() => openEditor({ kind: "family" })}
                      >
                        Create a family
                      </button>
                    )}
                  </section>
                ) : (
                  <div className={styles.familyGrid}>
                    {families.families.map((f) => (
                      <article className={styles.panel} key={f.id}>
                        <span className={styles.badge}>
                          {sideLabels[f.side]}
                        </span>
                        <h2>{f.name}</h2>
                        <p>
                          {f.activeCount} active · {f.archivedCount} archived
                        </p>
                        <p className={styles.muted}>
                          Primary contact:{" "}
                          {f.primaryContactName ?? "Not selected"}
                        </p>
                        {f.notes && <p className={styles.notes}>{f.notes}</p>}
                        <div className={styles.actions}>
                          <button
                            className={styles.secondary}
                            onClick={() => viewFamily(f.id, f.name)}
                          >
                            View guests
                          </button>
                          {props.canManage && (
                            <>
                              <button
                                className={styles.secondary}
                                onClick={() =>
                                  openEditor({
                                    kind: "guest",
                                    family: { id: f.id, name: f.name },
                                  })
                                }
                              >
                                Add person
                              </button>
                              <button
                                className={styles.secondary}
                                onClick={() =>
                                  openEditor({ kind: "family", family: f })
                                }
                              >
                                Edit family
                              </button>
                              <button
                                className={styles.danger}
                                disabled={f.activeCount + f.archivedCount > 0}
                                onClick={() => {
                                  setConfirmation({
                                    kind: "family",
                                    family: f,
                                  });
                                  setActionError("");
                                }}
                              >
                                Delete empty family
                              </button>
                            </>
                          )}
                        </div>
                        {props.canManage &&
                          f.activeCount + f.archivedCount > 0 && (
                            <small className={styles.muted}>
                              To delete this family, first reassign or ungroup
                              all its guests, including archived records.
                              Restore archived guests before editing their
                              family.
                            </small>
                          )}
                      </article>
                    ))}
                  </div>
                )}
                <Pager
                  page={page}
                  total={families?.total ?? 0}
                  busy={loading}
                  onPage={(p) => {
                    setPage(p);
                    setLoading(true);
                  }}
                />
              </>
            )}
            <footer className={styles.footnote}>
              Guests are attendees, not workspace collaborators. All guests are
              invited to every event. Guest invitation links and RSVP will
              follow in a separate step.
            </footer>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
