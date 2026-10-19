"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import type {
  MemberList,
  MemberView,
  InvitationView,
  RoleChoice,
} from "../member.types";
import { formatEventTime as taskDate } from "@/lib/date/time";
import styles from "./members.module.css";
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok || !body.success)
    throw new Error(body?.error?.message ?? "Please try again.");
  return body.data;
}
type Props = {
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
  timezone: string;
  canManage: boolean;
};
type Delivery = { message: string; link: string; emailSent: boolean };
function taskAccess(keys: string[]) {
  if (keys.includes("MANAGE_TASKS")) return "Can manage all wedding tasks.";
  if (keys.includes("VIEW_TASKS")) return "Can view all wedding tasks.";
  if (keys.includes("UPDATE_ASSIGNED_TASKS"))
    return "Can view assigned tasks and update their status/checklist completion.";
  if (keys.includes("VIEW_ASSIGNED_TASKS"))
    return "Can view assigned tasks only.";
  return "No task access.";
}
function Roles({
  roles,
  selected,
  onChange,
  disabled = false,
}: {
  roles: RoleChoice[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.roleChoices}>
      {roles.map((role) => (
        <label className={styles.roleChoice} key={role.id}>
          <input
            type="checkbox"
            aria-label={role.name}
            disabled={disabled || !role.assignable}
            checked={selected.includes(role.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, role.id]
                  : selected.filter((id) => id !== role.id),
              )
            }
          />
          <span>
            {role.name}
            <small>
              {role.description} {taskAccess(role.permissionKeys)}
              {!role.assignable
                ? " — protected or beyond your permissions"
                : ""}
            </small>
          </span>
        </label>
      ))}
    </div>
  );
}
export function MembersScreen(props: Props) {
  const [tab, setTab] = useState("members"),
    [data, setData] = useState<MemberList | null>(null),
    [invitations, setInvitations] = useState<{
      invitations: InvitationView[];
      total: number;
    }>({ invitations: [], total: 0 }),
    [roles, setRoles] = useState<RoleChoice[]>([]);
  const [page, setPage] = useState(1),
    [query, setQuery] = useState({ q: "", status: "", roleId: "" }),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [invite, setInvite] = useState(false),
    [editing, setEditing] = useState<MemberView | null>(null),
    [delivery, setDelivery] = useState<Delivery | null>(null),
    [copied, setCopied] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    item: InvitationView;
    action: "REVOKE" | "REPLACE";
  } | null>(null);
  useEffect(() => {
    if (!props.canManage) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page) });
      for (const [key, value] of Object.entries(query))
        if (value) params.set(key, value);
      Promise.all([
        api<MemberList>(`/api/v1/members?${params}`),
        api<{ roles: RoleChoice[] }>("/api/v1/roles"),
        api<{ invitations: InvitationView[]; total: number }>(
          `/api/v1/members/invitations?page=${page}`,
        ),
      ])
        .then(([members, r, i]) => {
          if (active) {
            setData(members);
            setRoles(r.roles);
            setInvitations(i);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [props.canManage, page, query, revision]);
  function reload() {
    setLoading(true);
    setRevision((v) => v + 1);
  }
  const total = tab === "members" ? (data?.total ?? 0) : invitations.total;
  return (
    <WorkspaceShell activePage="Members" {...props}>
      <div className={styles.page}>
        {!props.canManage ? (
          <section className={styles.empty}>
            <h1>Member management access required</h1>
            <p className={styles.muted}>
              Ask your wedding owner to manage collaborators.
            </p>
          </section>
        ) : (
          <>
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Together for the celebration</p>
                <h1>Wedding members & collaborators</h1>
                <p className={styles.muted}>
                  The people who help bring your day together.
                </p>
              </div>
              <button
                className={styles.primary}
                onClick={() => {
                  setInvite(true);
                  setEditing(null);
                  setDelivery(null);
                  setActionError("");
                }}
              >
                Invite collaborator
              </button>
            </header>
            {data && (
              <section className={styles.stats} aria-label="Member counts">
                {[
                  ["Active members", data.counts.active],
                  ["Pending invitations", data.counts.pending],
                  ["Suspended", data.counts.suspended],
                  ["Removed history", data.counts.removed],
                ].map(([label, count]) => (
                  <div className={styles.stat} key={label}>
                    <strong>{count}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </section>
            )}
            {invite && (
              <MemberInviteForm
                roles={roles}
                onClose={() => setInvite(false)}
                onSuccess={(result) => {
                  setDelivery(result);
                  setCopied(false);
                  setInvite(false);
                  reload();
                }}
              />
            )}
            {delivery && (
              <section className={styles.panel}>
                <h2>Invitation created</h2>
                <p
                  className={delivery.emailSent ? styles.success : styles.alert}
                  role="status"
                >
                  {delivery.message}
                </p>
                <label className={styles.field}>
                  Invitation link — shown only now
                  <input
                    className={styles.linkBox}
                    readOnly
                    value={delivery.link}
                  />
                </label>
                <p className={styles.muted}>
                  Expires after seven days. Later, create a replacement to get a
                  new link; this link is not stored in retrievable form.
                </p>
                <div className={styles.actions}>
                  <button
                    className={styles.secondary}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(delivery.link);
                        setCopied(true);
                      } catch {
                        setActionError(
                          "Copy failed. Select and copy the link above.",
                        );
                      }
                    }}
                  >
                    {copied ? "Copied" : "Copy invitation link"}
                  </button>
                  <button
                    className={styles.secondary}
                    onClick={() => setDelivery(null)}
                  >
                    Dismiss link
                  </button>
                </div>
              </section>
            )}
            {editing && (
              <MemberAccessForm
                key={`${editing.id}:${editing.updatedAt}`}
                member={editing}
                roles={roles}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null);
                  reload();
                }}
              />
            )}
            <nav className={styles.tabs} aria-label="Member sections">
              <button
                aria-pressed={tab === "members"}
                className={`${styles.secondary} ${tab === "members" ? styles.selected : ""}`}
                onClick={() => {
                  setTab("members");
                  setPage(1);
                }}
              >
                Members
              </button>
              <button
                aria-pressed={tab === "invitations"}
                className={`${styles.secondary} ${tab === "invitations" ? styles.selected : ""}`}
                onClick={() => {
                  setTab("invitations");
                  setPage(1);
                }}
              >
                Invitations
              </button>
            </nav>
            {tab === "members" && (
              <div className={`${styles.panel} ${styles.grid}`}>
                <label className={styles.field}>
                  Search members
                  <input
                    type="search"
                    value={query.q}
                    onChange={(e) => {
                      setPage(1);
                      setQuery((q) => ({ ...q, q: e.target.value }));
                    }}
                    placeholder="Name or email"
                  />
                </label>
                <label className={styles.field}>
                  Status
                  <select
                    value={query.status}
                    onChange={(e) => {
                      setPage(1);
                      setQuery((q) => ({ ...q, status: e.target.value }));
                    }}
                  >
                    <option value="">All statuses</option>
                    {["ACTIVE", "SUSPENDED", "REMOVED"].map((s) => (
                      <option key={s} value={s}>
                        {s.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Role
                  <select
                    value={query.roleId}
                    onChange={(e) => {
                      setPage(1);
                      setQuery((q) => ({ ...q, roleId: e.target.value }));
                    }}
                  >
                    <option value="">All roles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {actionError && (
              <p className={styles.alert} role="alert">
                {actionError}
                <button
                  className={styles.secondary}
                  onClick={() => {
                    setConfirmation(null);
                    setActionError("");
                    reload();
                  }}
                >
                  Reload invitations
                </button>
              </p>
            )}
            {confirmation && (
              <section className={styles.panel}>
                <h2>
                  {confirmation.action === "REVOKE"
                    ? "Revoke this invitation?"
                    : "Replace this invitation?"}
                </h2>
                <p className={styles.muted}>
                  The old link will stop working.{" "}
                  {confirmation.action === "REPLACE"
                    ? "A new seven-day invitation will be created and emailed."
                    : "The invitation stays in history."}
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
                    className={styles.danger}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setActionError("");
                      try {
                        const result = await api<
                          Delivery | { revoked: boolean }
                        >(
                          `/api/v1/members/invitations/${confirmation.item.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              action: confirmation.action,
                              updatedAt: confirmation.item.updatedAt,
                            }),
                          },
                        );
                        if ("link" in result) {
                          setDelivery(result);
                          setCopied(false);
                        }
                        setConfirmation(null);
                        reload();
                      } catch (e) {
                        setActionError(
                          e instanceof Error ? e.message : "Request failed.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Please wait…" : "Confirm"}
                  </button>
                </div>
              </section>
            )}
            {loading ? (
              <div className={styles.empty} role="status">
                Loading your team…
              </div>
            ) : error ? (
              <div className={styles.empty}>
                <p role="alert">{error}</p>
                <button className={styles.secondary} onClick={reload}>
                  Try again
                </button>
              </div>
            ) : tab === "members" ? (
              <div className={styles.list}>
                {!data?.members.length ? (
                  <div className={styles.empty}>
                    <h2>No matching members</h2>
                    <button
                      className={styles.secondary}
                      onClick={() => {
                        setQuery({ q: "", roleId: "", status: "" });
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  data.members.map((member) => (
                    <article className={styles.row} key={member.id}>
                      <div>
                        <strong>
                          {member.name} {member.current ? "(you)" : ""}
                        </strong>
                        <p className={styles.muted}>{member.email}</p>
                      </div>
                      <div className={styles.badges}>
                        {member.roles.map((role) => (
                          <span className={styles.badge} key={role}>
                            {role}
                          </span>
                        ))}
                      </div>
                      <span className={styles.badge}>
                        {member.status.toLowerCase()}
                      </span>
                      {member.protected ? (
                        <span className={styles.muted}>Protected access</span>
                      ) : member.status === "REMOVED" ? (
                        <span className={styles.muted}>Retained history</span>
                      ) : (
                        <button
                          className={styles.secondary}
                          onClick={() => {
                            setEditing(member);
                            setInvite(false);
                          }}
                        >
                          Manage access
                        </button>
                      )}
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className={styles.list}>
                {!invitations.invitations.length ? (
                  <div className={styles.empty}>
                    <h2>No invitations yet</h2>
                    <p className={styles.muted}>
                      Invite a collaborator to share the planning.
                    </p>
                  </div>
                ) : (
                  invitations.invitations.map((item) => (
                    <article className={styles.row} key={item.id}>
                      <div>
                        <strong>{item.email}</strong>
                        <p className={styles.muted}>
                          Invited by {item.inviter}
                          <br />
                          Expires {taskDate(item.expiresAt, props.timezone)}
                        </p>
                      </div>
                      <div className={styles.badges}>
                        {item.roles.map((role) => (
                          <span key={role} className={styles.badge}>
                            {role}
                          </span>
                        ))}
                      </div>
                      <span className={styles.badge}>
                        {item.status.toLowerCase()}
                      </span>
                      <div className={styles.actions}>
                        {item.status === "PENDING" && (
                          <button
                            className={styles.secondary}
                            disabled={busy}
                            onClick={() =>
                              setConfirmation({ item, action: "REVOKE" })
                            }
                          >
                            Revoke
                          </button>
                        )}
                        {item.status !== "ACCEPTED" && (
                          <button
                            className={styles.secondary}
                            disabled={busy}
                            onClick={() =>
                              setConfirmation({ item, action: "REPLACE" })
                            }
                          >
                            Replace link
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
            {!loading && !error && (total > 25 || page > 1) && (
              <nav className={styles.pager} aria-label="Member pages">
                <button
                  className={styles.secondary}
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className={styles.muted}>Page {page}</span>
                <button
                  className={styles.secondary}
                  disabled={page * 25 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
function MemberInviteForm({
  roles,
  onClose,
  onSuccess,
}: {
  roles: RoleChoice[];
  onClose: () => void;
  onSuccess: (r: Delivery) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSuccess(
        await api<Delivery>("/api/v1/members/invitations", {
          method: "POST",
          body: JSON.stringify({
            email: new FormData(e.currentTarget).get("email"),
            roleIds: selected,
          }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create invitation.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <h2 ref={heading} tabIndex={-1}>
        Invite a collaborator
      </h2>
      <form onSubmit={submit}>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, minWidth: 0 }}
        >
          <label className={styles.field}>
            Email address
            <input type="email" name="email" required maxLength={254} />
          </label>
          <p className={styles.muted}>
            Choose one or more existing roles. The recipient must verify this
            email before joining.
          </p>
          <Roles roles={roles} selected={selected} onChange={setSelected} />
        </fieldset>
        {error && (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={styles.primary}
            type="submit"
            disabled={busy || !selected.length}
          >
            {busy ? "Creating invitation…" : "Create & email invitation"}
          </button>
        </div>
      </form>
    </section>
  );
}
function MemberAccessForm({
  member,
  roles,
  onClose,
  onSaved,
}: {
  member: MemberView;
  roles: RoleChoice[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const [selected, setSelected] = useState(member.roleIds),
    [status, setStatus] = useState(member.status),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className={styles.panel}>
      <h2 ref={heading} tabIndex={-1}>
        Manage access · {member.name}
      </h2>
      <Roles
        disabled={busy}
        roles={roles}
        selected={selected}
        onChange={(ids) => {
          setSelected(ids);
          setConfirm(false);
        }}
      />
      <label className={styles.field} style={{ marginTop: 20 }}>
        Membership status
        <select
          disabled={busy}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as MemberView["status"]);
            setConfirm(false);
          }}
        >
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended — blocks access</option>
          <option value="REMOVED">Removed — retains history</option>
        </select>
      </label>
      <p className={styles.muted}>
        Removal preserves tasks, comments, and history. A removed member needs a
        new invitation to rejoin.
      </p>
      {error && (
        <p className={styles.alert} role="alert">
          {error}
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={onSaved}
          >
            Reload members — discard edits
          </button>
        </p>
      )}
      {confirm && (
        <p className={styles.alert}>
          Confirm changing roles/access for {member.name}.{" "}
          {status !== "ACTIVE"
            ? "This blocks their workspace access immediately."
            : "These roles determine what they can access."}
        </p>
      )}
      <div className={styles.actions}>
        <button className={styles.secondary} disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className={status === "ACTIVE" ? styles.primary : styles.danger}
          disabled={busy || !selected.length}
          onClick={async () => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            setBusy(true);
            setError("");
            try {
              await api(`/api/v1/members/${member.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  roleIds: selected,
                  status,
                  updatedAt: member.updatedAt,
                }),
              });
              onSaved();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not update access. Reload the member before retrying.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? "Saving…"
            : confirm
              ? "Confirm access change"
              : "Review changes"}
        </button>
      </div>
    </section>
  );
}
