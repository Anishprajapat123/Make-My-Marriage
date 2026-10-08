import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  IndianRupee,
  MapPin,
  MoreHorizontal,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import styles from "./dashboard-screen.module.css";

const summary = [
  {
    label: "Tasks completed",
    value: "37",
    detail: "of 52 total",
    icon: Check,
    tone: "plum",
    progress: 71,
  },
  {
    label: "Guest list",
    value: "742",
    detail: "across 186 families",
    icon: UsersRound,
    tone: "sage",
  },
  {
    label: "RSVP confirmed",
    value: "624",
    detail: "84% response rate",
    icon: CalendarDays,
    tone: "sand",
  },
  {
    label: "Expenses tracked",
    value: "₹4,82,500",
    detail: "of ₹10,00,000 budget",
    icon: IndianRupee,
    tone: "rose",
  },
];

const attentionItems = [
  {
    type: "Overdue task",
    title: "Confirm the final guest list",
    detail: "Assigned to you · Due 2 days ago",
    tone: "urgent",
    icon: CircleAlert,
  },
  {
    type: "Pending RSVP",
    title: "118 guests haven’t responded",
    detail: "Invitation response needed",
    tone: "pending",
    icon: UsersRound,
  },
  {
    type: "Payment coming up",
    title: "Photography · ₹35,000",
    detail: "Due in 5 days · Oct 13",
    tone: "payment",
    icon: IndianRupee,
  },
];

const activityItems = [
  {
    initials: "P",
    name: "Priya",
    action: "added 5 guests to the list",
    time: "10:32 AM",
    tone: "plum",
  },
  {
    initials: "R",
    name: "Rahul",
    action: "completed “Book the photographer”",
    time: "9:48 AM",
    tone: "sage",
  },
  {
    initials: "A",
    name: "Anish",
    action: "updated the Sangeet start time",
    time: "Yesterday",
    tone: "sand",
  },
];

const additionalActivityItems = [
  {
    initials: "M",
    name: "Meera",
    action: "shared the venue contact details",
    time: "Yesterday",
    tone: "rose",
  },
  {
    initials: "A",
    name: "Anish",
    action: "marked the invitation draft as ready",
    time: "Tuesday",
    tone: "sand",
  },
];

const searchableContent = [
  { label: "Haldi", detail: "Upcoming event · October 10", href: "#upcoming" },
  {
    label: "Confirm the final guest list",
    detail: "Overdue task · needs attention",
    href: "#attention",
  },
  {
    label: "118 guests haven’t responded",
    detail: "Pending RSVP · needs attention",
    href: "#attention",
  },
  {
    label: "Photography payment",
    detail: "₹35,000 due October 13",
    href: "#attention",
  },
  {
    label: "Recent activity",
    detail: "Latest workspace updates",
    href: "#activity",
  },
];

function PreviewLabel() {
  return (
    <span className={styles.previewLabel}>
      <Sparkles aria-hidden="true" size={13} />
      Sample workspace
    </span>
  );
}

export function DashboardScreen({
  searchQuery = "",
}: {
  searchQuery?: string;
}) {
  const cleanQuery = searchQuery.trim().slice(0, 100);
  const normalizedQuery = cleanQuery.toLocaleLowerCase();
  const searchResults = normalizedQuery
    ? searchableContent.filter((item) =>
        `${item.label} ${item.detail}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : [];

  return (
    <WorkspaceShell searchQuery={cleanQuery}>
      <div className={styles.dashboard}>
        <section className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <div className={styles.welcomeEyebrow}>
              <span className={styles.eyebrowLine} />
              Thursday, October 8, 2026
              <PreviewLabel />
            </div>
            <h1>
              Good morning, Anish<span>.</span>
            </h1>
            <p>Here’s what’s happening with your wedding.</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.weddingDate}>
              <CalendarDays aria-hidden="true" size={15} />
              <span>18 October 2026</span>
            </span>
            <details className={styles.actionMenu}>
              <summary className={styles.primaryButton}>
                <MoreHorizontal aria-hidden="true" size={17} />
                <span>Wedding actions</span>
                <ChevronDown aria-hidden="true" size={14} />
              </summary>
              <div className={styles.actionMenuPanel}>
                <a href="#dashboard-overview">Wedding overview</a>
                <a href="#summary">Planning progress</a>
                <a href="#upcoming">Upcoming celebration</a>
                <a href="#preview-note">About this preview</a>
              </div>
            </details>
          </div>
        </section>

        {cleanQuery ? (
          <section aria-live="polite" className={styles.searchResults}>
            <div className={styles.searchResultsHeader}>
              <div>
                <span className={styles.cardEyebrow}>SAMPLE DATA SEARCH</span>
                <h2>Results for “{cleanQuery}”</h2>
              </div>
              <a href="/dashboard">Clear search</a>
            </div>
            {searchResults.length ? (
              <div className={styles.searchResultsList}>
                {searchResults.map((result) => (
                  <a href={result.href} key={result.label}>
                    <span>
                      <strong>{result.label}</strong>
                      <small>{result.detail}</small>
                    </span>
                    <ArrowRight aria-hidden="true" size={15} />
                  </a>
                ))}
              </div>
            ) : (
              <p className={styles.noSearchResults}>
                No sample dashboard items matched that search.
              </p>
            )}
          </section>
        ) : null}

        <section
          aria-label="Wedding overview"
          className={styles.weddingBanner}
          id="dashboard-overview"
        >
          <div className={styles.couplePortrait} aria-hidden="true">
            <span>A</span>
            <i>&</i>
            <span>P</span>
          </div>
          <div className={styles.weddingIdentity}>
            <span className={styles.cardEyebrow}>THE CELEBRATION OF</span>
            <h2>
              Anish <span>&</span> Priya
            </h2>
            <p>
              Jaipur, Rajasthan <span>·</span> 18 October 2026
            </p>
          </div>
          <div className={styles.countdown}>
            <strong>10</strong>
            <span>days to go</span>
          </div>
          <div className={styles.bannerOrnament} aria-hidden="true">
            ✳
          </div>
        </section>

        <section
          aria-label="Planning summary"
          className={styles.summaryGrid}
          id="summary"
        >
          {summary.map(
            ({ label, value, detail, icon: Icon, tone, progress }) => (
              <article className={styles.summaryCard} key={label}>
                <div className={styles.summaryTop}>
                  <span className={`${styles.summaryIcon} ${styles[tone]}`}>
                    <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                  </span>
                  {typeof progress === "number" ? (
                    <span className={styles.progressNote}>{progress}%</span>
                  ) : null}
                </div>
                <p className={styles.summaryLabel}>{label}</p>
                <div className={styles.summaryValue}>{value}</div>
                <p className={styles.summaryDetail}>{detail}</p>
                {typeof progress === "number" ? (
                  <div
                    aria-label={`${progress}% complete`}
                    className={styles.progressTrack}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>
                ) : null}
              </article>
            ),
          )}
        </section>

        <div className={styles.contentGrid}>
          <section
            aria-labelledby="upcoming-title"
            className={styles.upcomingCard}
            id="upcoming"
          >
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.cardEyebrow}>UP NEXT</span>
                <h2 id="upcoming-title">Your next celebration</h2>
              </div>
              <span className={styles.upcomingCount}>
                01 <span>/ 05</span>
              </span>
            </div>
            <div className={styles.eventPanel}>
              <div className={styles.eventDateBlock}>
                <span>OCT</span>
                <strong>10</strong>
                <span>SATURDAY</span>
              </div>
              <div className={styles.eventDetails}>
                <span className={styles.eventType}>PRE-WEDDING CEREMONY</span>
                <h3>Haldi</h3>
                <div className={styles.eventMeta}>
                  <span>
                    <Clock3 aria-hidden="true" size={14} /> 10:00 AM – 1:00 PM
                  </span>
                  <span>
                    <MapPin aria-hidden="true" size={14} /> The Rosewood
                    Courtyard
                  </span>
                </div>
              </div>
              <span className={styles.eventStatus}>In 2 days</span>
            </div>
            <div className={styles.timelinePreview}>
              <span className={styles.timelineDot} />
              <div>
                <span className={styles.timelineTime}>10:00 AM</span>
                <strong>Welcome & refreshments</strong>
              </div>
              <span className={styles.timelineDivider} />
              <span className={styles.timelineDotMuted} />
              <div>
                <span className={styles.timelineTime}>11:00 AM</span>
                <strong>Haldi ceremony</strong>
              </div>
            </div>
            <div className={styles.eventFooter}>
              <span>Timeline preview · 2 of 5 ceremony moments</span>
              <span className={styles.previewOnly}>Sample event</span>
            </div>
          </section>

          <section
            aria-labelledby="attention-title"
            className={styles.attentionCard}
            id="attention"
          >
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.cardEyebrow}>A LITTLE NUDGE</span>
                <h2 id="attention-title">Needs your attention</h2>
              </div>
              <span className={styles.attentionCount}>3</span>
            </div>
            <div className={styles.attentionList}>
              {attentionItems.map(
                ({ type, title, detail, tone, icon: Icon }) => (
                  <details className={styles.attentionDisclosure} key={title}>
                    <summary className={styles.attentionItem}>
                      <span
                        className={`${styles.attentionIcon} ${styles[tone]}`}
                      >
                        <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                      </span>
                      <span className={styles.attentionCopy}>
                        <span className={styles.attentionType}>{type}</span>
                        <strong>{title}</strong>
                        <span className={styles.attentionDetail}>{detail}</span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={styles.attentionArrow}
                        size={15}
                      />
                    </summary>
                    <p className={styles.attentionExpanded}>
                      Sample reminder only. This item will open its management
                      screen when that feature is built.
                    </p>
                  </details>
                ),
              )}
            </div>
            <div className={styles.attentionFooter}>
              <span>There’s a lot to coordinate. You’re doing well.</span>
              <span aria-hidden="true">♡</span>
            </div>
          </section>

          <section
            aria-labelledby="activity-title"
            className={styles.activityCard}
            id="activity"
          >
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.cardEyebrow}>THE LATEST</span>
                <h2 id="activity-title">Recent activity</h2>
              </div>
            </div>
            <div className={styles.activityList}>
              {activityItems.map(({ initials, name, action, time, tone }) => (
                <article
                  className={styles.activityItem}
                  key={`${name}-${time}`}
                >
                  <span className={`${styles.activityAvatar} ${styles[tone]}`}>
                    {initials}
                  </span>
                  <span className={styles.activityCopy}>
                    <span>
                      <strong>{name}</strong> {action}
                    </span>
                    <time>{time}</time>
                  </span>
                  <span
                    aria-hidden="true"
                    className={styles.activityIndicator}
                  />
                </article>
              ))}
            </div>
            <details className={styles.activityExpansion}>
              <summary className={styles.textAction}>
                Show 2 more updates <ChevronDown aria-hidden="true" size={14} />
              </summary>
              <div className={styles.activityList}>
                {additionalActivityItems.map(
                  ({ initials, name, action, time, tone }) => (
                    <article
                      className={styles.activityItem}
                      key={`${name}-${time}`}
                    >
                      <span
                        className={`${styles.activityAvatar} ${styles[tone]}`}
                      >
                        {initials}
                      </span>
                      <span className={styles.activityCopy}>
                        <span>
                          <strong>{name}</strong> {action}
                        </span>
                        <time>{time}</time>
                      </span>
                    </article>
                  ),
                )}
              </div>
            </details>
          </section>

          <section aria-labelledby="moment-title" className={styles.momentCard}>
            <div className={styles.momentTopline}>
              <Sparkles aria-hidden="true" size={15} />A MOMENT TO PAUSE
            </div>
            <h2 id="moment-title">One thing at a time.</h2>
            <p>Every thoughtful detail is bringing your celebration closer.</p>
            <div className={styles.momentFooter}>
              <span>Today’s planning note</span>
              <span className={styles.previewOnly}>A gentle reminder</span>
            </div>
          </section>
        </div>

        <p className={styles.sampleNotice} id="preview-note">
          <span aria-hidden="true">i</span>
          All names, dates, counts and activity shown here are sample content
          for the UI preview.
        </p>
      </div>
    </WorkspaceShell>
  );
}
