import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  CircleHelp,
  CircleUserRound,
  CreditCard,
  Images,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Menu,
  Radio,
  Search,
  Settings2,
  UsersRound,
  Store,
} from "lucide-react";
import type { ReactNode } from "react";
import styles from "./workspace-shell.module.css";

const navigation = [
  {
    label: "Workspace",
    items: [{ label: "Dashboard", icon: LayoutDashboard, active: true }],
  },
  {
    label: "Plan",
    items: [
      { label: "Events", icon: CalendarDays, active: false },
      { label: "Tasks", icon: CheckSquare, active: false },
      { label: "Guests & RSVP", icon: UsersRound, active: false },
      { label: "Invitations", icon: Mail, active: false },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Expenses", icon: CreditCard, active: false },
      { label: "Vendors", icon: Store, active: false },
      { label: "Gallery", icon: Images, active: false },
      { label: "Livestream", icon: Radio, active: false },
      { label: "Issues", icon: LifeBuoy, active: false },
      { label: "Members", icon: CircleUserRound, active: false },
    ],
  },
];

function NavigationItems() {
  return (
    <nav aria-label="Workspace navigation" className={styles.navigation}>
      {navigation.map((group) => (
        <div className={styles.navigationGroup} key={group.label}>
          <p className={styles.groupLabel}>{group.label}</p>
          {group.items.map(({ label, icon: Icon, active }) =>
            active ? (
              <Link
                aria-current="page"
                className={`${styles.navigationItem} ${styles.activeItem}`}
                href="/dashboard"
                key={label}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={`${styles.navigationItem} ${styles.upcomingItem}`}
                key={label}
                title={`${label} screen is planned for a later UI step`}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </span>
            ),
          )}
        </div>
      ))}
    </nav>
  );
}

function BrandLink() {
  return (
    <Link
      aria-label="Make My Marriage dashboard"
      className={styles.brand}
      href="/dashboard"
    >
      <svg
        aria-hidden="true"
        className={styles.brandMark}
        fill="none"
        viewBox="0 0 40 40"
      >
        <rect x="1" y="1" width="38" height="38" rx="12" />
        <path d="M11.5 29V20a8.5 8.5 0 0 1 17 0v9" />
        <path d="M14.5 28.5v-7l5.5 5 5.5-5v7" />
        <circle cx="20" cy="11.5" r="1.3" />
      </svg>
      <span className={styles.brandName}>Make My Marriage</span>
    </Link>
  );
}

function SidebarContents() {
  return (
    <>
      <BrandLink />

      <div className={styles.weddingPicker}>
        <span className={styles.weddingInitials}>
          A<span>·</span>P
        </span>
        <span className={styles.weddingPickerText}>
          <span className={styles.weddingPickerLabel}>Wedding workspace</span>
          <span className={styles.weddingPickerName}>Anish & Priya</span>
        </span>
      </div>

      <NavigationItems />

      <div className={styles.sidebarBottom}>
        <span
          aria-disabled="true"
          className={`${styles.navigationItem} ${styles.upcomingItem}`}
          title="Settings screen is planned for a later UI step"
        >
          <Settings2 aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>Settings</span>
        </span>
        <div className={styles.memberCard}>
          <span aria-hidden="true" className={styles.memberAvatar}>
            A
          </span>
          <span className={styles.memberText}>
            <span className={styles.memberName}>Anish</span>
            <span className={styles.memberRole}>Workspace owner</span>
          </span>
          <span className={styles.memberBadge}>OWNER</span>
        </div>
      </div>
    </>
  );
}

export function WorkspaceShell({
  children,
  searchQuery = "",
}: {
  children: ReactNode;
  searchQuery?: string;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <SidebarContents />
      </aside>

      <div className={styles.mobileHeader}>
        <BrandLink />
        <details className={styles.mobileMenu}>
          <summary aria-label="Open workspace navigation">
            <Menu aria-hidden="true" size={20} />
          </summary>
          <div className={styles.mobileMenuPanel}>
            <SidebarContents />
          </div>
        </details>
      </div>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <strong>Dashboard</strong>
          </div>
          <div className={styles.topbarActions}>
            <form
              action="/dashboard"
              className={styles.searchBox}
              role="search"
            >
              <button aria-label="Search sample dashboard" type="submit">
                <Search aria-hidden="true" size={16} />
              </button>
              <input
                aria-label="Search sample dashboard content"
                defaultValue={searchQuery}
                name="q"
                placeholder="Search this dashboard"
                type="search"
              />
              <kbd>Enter</kbd>
            </form>
            <details className={styles.headerPopover}>
              <summary
                aria-label="Open sample notifications"
                className={styles.iconButton}
              >
                <Bell aria-hidden="true" size={19} />
                <span className={styles.notificationDot} />
              </summary>
              <div className={styles.popoverPanel}>
                <strong>Recent updates</strong>
                <p>Priya added 5 guests to the sample list.</p>
                <p>Photography payment is due in 5 days.</p>
                <span>Preview notifications · not live</span>
              </div>
            </details>
            <details className={styles.headerPopover}>
              <summary
                aria-label="Open dashboard help"
                className={styles.iconButton}
              >
                <CircleHelp aria-hidden="true" size={19} />
              </summary>
              <div className={styles.popoverPanel}>
                <strong>About this dashboard</strong>
                <p>
                  This is a responsive UI preview built from sample wedding
                  data.
                </p>
                <span>
                  Actions and records are not connected to an account yet.
                </span>
              </div>
            </details>
          </div>
        </header>
        {children}
        <footer className={styles.previewFooter}>
          Dashboard preview · sample data only
        </footer>
      </main>
    </div>
  );
}
