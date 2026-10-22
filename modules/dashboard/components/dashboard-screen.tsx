import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  IndianRupee,
  Store,
  UsersRound,
} from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import type { DashboardData } from "../dashboard.service";
import { formatMoney } from "@/modules/expenses/expense.money";
import { statusLabels } from "@/modules/tasks/task.types";
import styles from "./dashboard-screen.module.css";
type Wedding = {
  title: string;
  bride: { name: string };
  groom: { name: string };
  weddingDate: Date;
  city: string;
  timezone: string;
};
export function DashboardScreen({
  searchQuery = "",
  memberName,
  wedding,
  data,
  roleLabel,
}: {
  searchQuery?: string;
  memberName: string;
  wedding: Wedding;
  data: DashboardData | null;
  roleLabel: string;
}) {
  const cleanQuery = searchQuery.trim().slice(0, 100),
    now = new Date();
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const dateLabel = dateFormat.format(wedding.weddingDate);
  const todayParts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: wedding.timezone,
    numberingSystem: "latn",
    calendar: "gregory",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(todayParts.find((p) => p.type === type)?.value);
  const days = Math.ceil(
    (wedding.weddingDate.getTime() -
      Date.UTC(part("year"), part("month") - 1, part("day"))) /
      86400000,
  );
  const todayLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: wedding.timezone,
  }).format(now);
  const when = (value: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: wedding.timezone,
    }).format(new Date(value));
  const summary = [];
  if (data?.tasks)
    summary.push({
      label: data.tasks.assignedOnly ? "My tasks completed" : "Tasks completed",
      value: String(data.tasks.counts.completed),
      detail: `of ${data.tasks.counts.total} ${data.tasks.assignedOnly ? "assigned" : "total"} tasks`,
      icon: Check,
      tone: "plum",
      href: "/tasks",
    });
  if (data?.guests)
    summary.push({
      label: "Guest list",
      value: String(data.guests.total),
      detail: `Active guests · ${data.guests.families} families on file`,
      icon: UsersRound,
      tone: "sage",
      href: "/guests",
    });
  if (data?.rsvp)
    summary.push({
      label: "RSVP · Yes",
      value: String(data.rsvp.yes),
      detail: `${data.rsvp.pending} pending · ${data.rsvp.no} declined`,
      icon: CalendarDays,
      tone: "sand",
      href: "/invitations",
    });
  if (data?.expenses)
    summary.push({
      label: "Paid to date",
      value: formatMoney(data.expenses.paid),
      detail: "Recorded external payments · Budget not set",
      icon: IndianRupee,
      tone: "rose",
      href: "/expenses",
    });
  if (data?.vendors)
    summary.push({
      label: "Active vendors",
      value: String(data.vendors.active),
      detail: "Suppliers in your wedding directory",
      icon: Store,
      tone: "plum",
      href: "/vendors",
    });
  const searchable = [
    ...summary.map((s) => ({
      label: s.label,
      detail: `${s.value} · ${s.detail}`,
      href: s.href,
    })),
    ...(data?.events ?? []).map((e) => ({
      label: e.name,
      detail: `Event · ${when(e.startAt)}`,
      href: `/events/${e.id}`,
    })),
    ...(data?.tasks?.recent ?? []).map((t) => ({
      label: t.title,
      detail: `Task · ${statusLabels[t.status]}`,
      href: `/tasks/${t.id}`,
    })),
  ];
  const matches = cleanQuery
    ? searchable.filter((item) =>
        `${item.label} ${item.detail}`
          .toLocaleLowerCase()
          .includes(cleanQuery.toLocaleLowerCase()),
      )
    : [];
  const attention = [];
  if (data?.tasks?.counts.overdue)
    attention.push({
      label: `${data.tasks.counts.overdue} overdue ${data.tasks.assignedOnly ? "assigned " : ""}tasks`,
      detail: "Review deadlines and update progress.",
      href: "/tasks",
    });
  if (data?.rsvp?.pending)
    attention.push({
      label: `${data.rsvp.pending} guests have not responded`,
      detail: "RSVP confirmations are responses, not checked-in attendance.",
      href: "/invitations",
    });
  if (data?.expenses?.overdue)
    attention.push({
      label: `${data.expenses.overdue} overdue unpaid expenses`,
      detail: "Review your recorded deadlines in Expenses.",
      href: "/expenses",
    });
  return (
    <WorkspaceShell
      searchQuery={cleanQuery}
      weddingTitle={wedding.title}
      memberName={memberName}
      roleLabel={roleLabel}
    >
      <div className={styles.dashboard}>
        <section className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <div className={styles.welcomeEyebrow}>
              <span className={styles.eyebrowLine} />
              {todayLabel}
            </div>
            <h1>
              Hello, {memberName.trim().split(/\s+/)[0] || "there"}
              <span>.</span>
            </h1>
            <p>Here’s what’s happening with your wedding.</p>
          </div>
          <span className={styles.weddingDate}>
            <CalendarDays size={16} aria-hidden="true" />
            {dateLabel}
          </span>
        </section>
        <section className={styles.weddingBanner} aria-label="Wedding overview">
          <div className={styles.couplePortrait} aria-hidden="true">
            <span>{wedding.bride.name.slice(0, 1)}</span>
            <i>&</i>
            <span>{wedding.groom.name.slice(0, 1)}</span>
          </div>
          <div className={styles.weddingIdentity}>
            <span className={styles.cardEyebrow}>THE CELEBRATION OF</span>
            <h2>{wedding.title}</h2>
            <p>
              {wedding.city} · {dateLabel}
            </p>
          </div>
          <div className={styles.countdown}>
            <strong>{Math.abs(days)}</strong>
            <span>
              {days < 0 ? "days since" : days === 0 ? "today" : "days to go"}
            </span>
          </div>
        </section>
        {!data ? (
          <section className={styles.liveEmpty} role="alert">
            <h2>Dashboard data is temporarily unavailable</h2>
            <p>Your records have not been changed. Reload to try again.</p>
            <a className={styles.liveAction} href="/dashboard">
              Retry dashboard
            </a>
          </section>
        ) : (
          <>
            {cleanQuery ? (
              <section className={styles.searchResults}>
                <div className={styles.searchResultsHeader}>
                  <div>
                    <span className={styles.cardEyebrow}>
                      CURRENT DASHBOARD ITEMS
                    </span>
                    <h2>Results for “{cleanQuery}”</h2>
                  </div>
                  <Link href="/dashboard">Clear search</Link>
                </div>
                {matches.length ? (
                  <div className={styles.searchResultsList}>
                    {matches.map((item, i) => (
                      <Link key={`${item.href}-${i}`} href={item.href}>
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noSearchResults}>
                    No items in this dashboard snapshot match. Open the relevant
                    module to search all its records.
                  </p>
                )}
              </section>
            ) : null}
            {summary.length ? (
              <section
                className={styles.summaryGrid}
                aria-label="Planning summary"
              >
                {summary.map(
                  ({ label, value, detail, icon: Icon, tone, href }) => (
                    <article className={styles.summaryCard} key={label}>
                      <div className={styles.summaryTop}>
                        <span
                          className={`${styles.summaryIcon} ${styles[tone]}`}
                        >
                          <Icon size={18} aria-hidden="true" />
                        </span>
                      </div>
                      <p className={styles.summaryLabel}>{label}</p>
                      <div className={styles.summaryValue}>{value}</div>
                      <p className={styles.summaryDetail}>{detail}</p>
                      <Link className={styles.liveAction} href={href}>
                        Open {href.slice(1)}
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </article>
                  ),
                )}
              </section>
            ) : (
              <p className={styles.liveEmpty}>
                Your role has no planning summaries available. Ask your wedding
                administrator if you need access to another module.
              </p>
            )}
            <div className={styles.contentGrid}>
              {data.events !== null ? (
                <section className={styles.upcomingCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <span className={styles.cardEyebrow}>ON THE HORIZON</span>
                      <h2>Upcoming events</h2>
                    </div>
                    <Link className={styles.liveAction} href="/events">
                      View events
                    </Link>
                  </div>
                  <p className={styles.liveMuted}>
                    Next published events · {wedding.timezone}
                  </p>
                  {data.events.length ? (
                    <ul className={styles.liveList}>
                      {data.events.map((event) => (
                        <li key={event.id}>
                          <Link href={`/events/${event.id}`}>
                            <strong>{event.name}</strong>
                            <span>{when(event.startAt)}</span>
                            <small>
                              {event.venue || "Venue not specified"}
                            </small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.liveEmpty}>
                      No upcoming published events. Your full schedule,
                      including drafts, is available in Events.
                    </p>
                  )}
                </section>
              ) : null}
              <section className={styles.attentionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.cardEyebrow}>
                      KEEP THINGS MOVING
                    </span>
                    <h2>Needs attention</h2>
                  </div>
                </div>
                {attention.length ? (
                  <ul className={styles.liveList}>
                    {attention.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href}>
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.liveEmpty}>
                    No overdue tasks, unpaid deadlines or pending responses in
                    the areas you can view.
                  </p>
                )}
              </section>
              {data.tasks ? (
                <section className={styles.activityCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <span className={styles.cardEyebrow}>
                        {data.tasks.assignedOnly
                          ? "ASSIGNED TO YOU"
                          : "PLANNING TOGETHER"}
                      </span>
                      <h2>Recent tasks</h2>
                    </div>
                    <Link className={styles.liveAction} href="/tasks">
                      View tasks
                    </Link>
                  </div>
                  {data.tasks.recent.length ? (
                    <ul className={styles.liveList}>
                      {data.tasks.recent.map((task) => (
                        <li key={task.id}>
                          <Link href={`/tasks/${task.id}`}>
                            <strong>{task.title}</strong>
                            <small>
                              {statusLabels[task.status]}
                              {task.dueAt
                                ? ` · Due ${when(task.dueAt)}`
                                : " · No deadline"}
                            </small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.liveEmpty}>
                      {data.tasks.assignedOnly
                        ? "No tasks assigned to you yet."
                        : "No tasks yet. Start planning in Tasks."}
                    </p>
                  )}
                </section>
              ) : null}
              {data.expenses ? (
                <section className={styles.activityCard}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <span className={styles.cardEyebrow}>
                        YOUR RECORDED SPENDING
                      </span>
                      <h2>Expense overview</h2>
                    </div>
                    <Link className={styles.liveAction} href="/expenses">
                      View expenses
                    </Link>
                  </div>
                  <dl className={styles.liveMoney}>
                    <dt>Estimated</dt>
                    <dd>{formatMoney(data.expenses.estimated)}</dd>
                    <dt>Committed · unpaid</dt>
                    <dd>{formatMoney(data.expenses.committed)}</dd>
                    <dt>Paid</dt>
                    <dd>{formatMoney(data.expenses.paid)}</dd>
                  </dl>
                  <p className={styles.liveMuted}>
                    Active expenses only. Budget not set. Recording a payment
                    never transfers money.
                  </p>
                </section>
              ) : null}
            </div>
            <p className={styles.sampleNotice}>
              Only data allowed by your current wedding role appears here.
              Snapshot updated {when(data.generatedAt)}. Reload to refresh.
            </p>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
