"use client";
import { useEffect, useState, type FormEvent } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { guestFetch, Pager } from "@/modules/guests/components/guest-ui";
import type {
  InvitationConfig,
  InvitationList,
  InvitationRow,
} from "../invitation.types";
import styles from "@/modules/guests/components/guests.module.css";
type Props = {
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
  canManage: boolean;
  canRsvp: boolean;
  canView: boolean;
};
export function InvitationsScreen(props: Props) {
  const [config, setConfig] = useState<InvitationConfig | null>(null),
    [data, setData] = useState<InvitationList | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [issued, setIssued] = useState<{ url: string; message: string } | null>(
      null,
    ),
    [copied, setCopied] = useState(false),
    [confirm, setConfirm] = useState<{
      row: InvitationRow;
      action: "REPLACE" | "REVOKE";
    } | null>(null);
  useEffect(() => {
    if (!props.canView) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const load = async () => {
        const [c, d] = await Promise.all([
          props.canManage
            ? guestFetch<{ config: InvitationConfig | null }>(
                "/api/v1/invitations",
                { signal: controller.signal },
              )
            : Promise.resolve({ config: null }),
          guestFetch<InvitationList>(
            `/api/v1/${props.canManage ? "invitations/status" : "rsvp"}?${new URLSearchParams({ search, status, page: String(page), limit: "25" })}`,
            { signal: controller.signal },
          ),
        ]);
        if (!controller.signal.aborted) {
          setConfig(c.config);
          setData(d);
        }
      };
      load()
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
  }, [props.canView, props.canManage, search, status, page, refresh]);
  function reload() {
    setRefresh((v) => v + 1);
  }
  async function act(
    row: InvitationRow,
    action: "ISSUE" | "REPLACE" | "REVOKE",
  ) {
    setBusy(true);
    setActionError("");
    try {
      const r = await guestFetch<{ url?: string; message?: string }>(
        "/api/v1/invitations/guest-links",
        {
          method: "POST",
          body: JSON.stringify({
            guestId: row.guestId,
            action,
            revision: row.revision,
          }),
        },
      );
      setConfirm(null);
      if (r.url) {
        setIssued({ url: r.url, message: r.message! });
        setCopied(false);
      } else setIssued(null);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update link.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <WorkspaceShell
      activePage="Invitations"
      weddingTitle={props.weddingTitle}
      memberName={props.memberName}
      roleLabel={props.roleLabel}
    >
      <div className={styles.page}>
        {!props.canView ? (
          <section className={styles.empty}>
            <h1>Invitations access restricted</h1>
            <p>Ask the wedding owner for invitation or RSVP viewing access.</p>
          </section>
        ) : (
          <>
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>An invitation, made personal</p>
                <h1>Invitations & RSVP</h1>
                <p className={styles.muted}>
                  Share a private link. Let each guest respond without creating
                  an account.
                </p>
              </div>
            </header>
            {data && !error && (
              <section
                className={styles.stats}
                aria-label="Invitation and RSVP counts"
              >
                <div>
                  <span>Active guests</span>
                  <strong>{data.counts.active}</strong>
                  <small>Includes individual companions</small>
                </div>
                <div>
                  <span>Active links</span>
                  <strong>{data.counts.linked}</strong>
                  <small>Generated, not proof of delivery</small>
                </div>
                {props.canRsvp && (
                  <>
                    <div>
                      <span>Confirmed</span>
                      <strong>{data.counts.yes}</strong>
                      <small>{data.counts.no} declined</small>
                    </div>
                    <div>
                      <span>Pending response</span>
                      <strong>{data.counts.pending}</strong>
                      <small>Includes guests without a link</small>
                    </div>
                  </>
                )}
              </section>
            )}
            {props.canManage && !loading && !error && (
              <ConfigForm
                key={config?.revision ?? "new"}
                config={config}
                weddingTitle={props.weddingTitle}
                onSaved={reload}
              />
            )}
            {issued && (
              <section
                className={styles.panel}
                aria-label="New guest invitation link"
              >
                <h2>Your guest link is ready</h2>
                <p>{issued.message}</p>
                <label className={styles.field}>
                  Copy this private link now
                  <input
                    readOnly
                    value={issued.url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <div className={styles.actions}>
                  <button
                    className={styles.primary}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(issued.url);
                        setCopied(true);
                      } catch {
                        setActionError(
                          "Copy failed. Select and copy the link above.",
                        );
                      }
                    }}
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <button
                    className={styles.secondary}
                    onClick={() => setIssued(null)}
                  >
                    Dismiss link
                  </button>
                </div>
              </section>
            )}
            {actionError && (
              <div className={styles.alert} role="alert">
                {actionError}
                <button
                  className={styles.secondary}
                  onClick={() => {
                    setActionError("");
                    setConfirm(null);
                    reload();
                  }}
                >
                  Reload link records
                </button>
              </div>
            )}
            {confirm && (
              <section className={styles.confirm}>
                <h2>
                  {confirm.action === "REVOKE" ? "Revoke" : "Replace"}{" "}
                  {confirm.row.name}’s link?
                </h2>
                <p>
                  The previous link will stop working. Existing RSVP records
                  stay in your wedding.
                  {confirm.action === "REPLACE" &&
                    " A new private link will be shown once."}
                </p>
                <div className={styles.actions}>
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => setConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.danger}
                    disabled={busy}
                    onClick={() => act(confirm.row, confirm.action)}
                  >
                    {busy ? "Saving…" : "Confirm link change"}
                  </button>
                </div>
              </section>
            )}
            <section className={styles.filters}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  Search invited guests
                  <input
                    type="search"
                    value={search}
                    maxLength={180}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                {props.canRsvp && (
                  <label className={styles.field}>
                    RSVP response
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="ALL">All responses</option>
                      <option value="YES">Confirmed</option>
                      <option value="NO">Declined</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </label>
                )}
              </div>
            </section>
            {loading ? (
              <section className={styles.empty} role="status">
                Loading invitations…
              </section>
            ) : error ? (
              <section className={styles.empty}>
                <p role="alert">{error}</p>
                <button className={styles.primary} onClick={reload}>
                  Try again
                </button>
              </section>
            ) : !data?.rows.length ? (
              <section className={styles.empty}>
                <h2>
                  {search || status !== "ALL"
                    ? "No matching guests"
                    : "Start with your guest list"}
                </h2>
                <p>
                  Add guests before generating their personal invitation links.
                </p>
                <a href="/guests" className={styles.secondary}>
                  Open guests
                </a>
              </section>
            ) : (
              <>
                <div className={styles.ledger}>
                  <div className={styles.tableHead}>
                    <span>Guest</span>
                    <span>Link status</span>
                    <span>RSVP</span>
                    <span>Actions</span>
                  </div>
                  {data.rows.map((row) => (
                    <article className={styles.row} key={row.guestId}>
                      <div>
                        <strong>{row.name}</strong>
                        <p className={styles.muted}>
                          {row.familyName ?? "Ungrouped"}
                        </p>
                      </div>
                      <span className={styles.badge}>
                        {row.linkStatus ?? "Not generated"}
                      </span>
                      <span>
                        {row.response === null
                          ? "Access restricted"
                          : row.response === "YES"
                            ? "Confirmed"
                            : row.response === "NO"
                              ? "Declined"
                              : "Pending"}
                      </span>
                      <div className={styles.actions}>
                        {props.canManage &&
                          (row.linkStatus ? (
                            <>
                              <button
                                className={styles.secondary}
                                disabled={busy}
                                onClick={() =>
                                  setConfirm({ row, action: "REPLACE" })
                                }
                              >
                                Replace link
                              </button>
                              {row.linkStatus === "ACTIVE" && (
                                <button
                                  className={styles.danger}
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({ row, action: "REVOKE" })
                                  }
                                >
                                  Revoke
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              className={styles.primary}
                              disabled={busy || !config}
                              onClick={() => act(row, "ISSUE")}
                            >
                              Create link
                            </button>
                          ))}
                      </div>
                    </article>
                  ))}
                </div>
                <Pager page={page} total={data.total} onPage={setPage} />
              </>
            )}
            <p className={styles.footnote}>
              Guest links do not expire automatically. Share links manually and
              privately; this flow sends no email or WhatsApp message. Archived
              guests cannot use their previous links, even after restoration.
            </p>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
function ConfigForm({
  config,
  weddingTitle,
  onSaved,
}: {
  config: InvitationConfig | null;
  weddingTitle: string;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await guestFetch("/api/v1/invitations", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          welcomeMessage: form.get("welcomeMessage"),
          story: form.get("story"),
          language: form.get("language"),
          published: form.get("published") === "on",
          revision: config?.revision ?? null,
        }),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save invitation.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className={styles.panel} open={!config}>
      <summary style={{ cursor: "pointer", minHeight: 44 }}>
        Invitation content · {config?.published ? "Published" : "Draft"}
      </summary>
      <h2>A welcome from you</h2>
      <p className={styles.muted}>
        Publishing enables only holders of active guest links to open this
        invitation. Unpublishing also pauses RSVP submissions.
      </p>
      <form onSubmit={save}>
        <fieldset disabled={busy} className={styles.fieldset}>
          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.full}`}>
              Invitation title
              <input
                name="title"
                required
                maxLength={180}
                defaultValue={config?.title ?? weddingTitle}
              />
            </label>
            <label className={`${styles.field} ${styles.full}`}>
              Welcome message
              <textarea
                name="welcomeMessage"
                maxLength={2000}
                defaultValue={config?.welcomeMessage ?? ""}
              />
            </label>
            <label className={`${styles.field} ${styles.full}`}>
              Your story (optional)
              <textarea
                name="story"
                maxLength={5000}
                defaultValue={config?.story ?? ""}
              />
            </label>
            <label className={styles.field}>
              Invitation language
              <select name="language" defaultValue={config?.language ?? "en"}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
              }}
            >
              <input
                type="checkbox"
                name="published"
                defaultChecked={config?.published ?? false}
              />{" "}
              Publish invitation
            </label>
          </div>
        </fieldset>
        {error && (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        )}
        <button
          className={styles.primary}
          style={{ marginTop: 20 }}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save invitation"}
        </button>
      </form>
    </details>
  );
}
