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
import { SignOutButton } from "./sign-out-button";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";

const navigation = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, active: true },
      { label: "Notifications", icon: Bell, active: false },
    ],
  },
  {
    label: "Plan",
    items: [
      { label: "Events", icon: CalendarDays, active: false },
      { label: "Tasks", icon: CheckSquare, active: false },
      { label: "Guests", icon: UsersRound, active: false },
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

function NavigationItems({
  activePage = "Dashboard",
}: {
  activePage?: string;
}) {
  return (
    <nav aria-label="Workspace navigation" className={styles.navigation}>
      {navigation.map((group) => (
        <div className={styles.navigationGroup} key={group.label}>
          <p className={styles.groupLabel}>{group.label}</p>
          {group.items.map(({ label, icon: Icon, active }) =>
            active ||
            label === "Events" ||
            label === "Tasks" ||
            label === "Guests" ||
            label === "Invitations" ||
            label === "Expenses" ||
            label === "Vendors" ||
            label === "Gallery" ||
            label === "Livestream" ||
            label === "Notifications" ||
            label === "Issues" ||
            label === "Members" ? (
              <Link
                aria-current={label === activePage ? "page" : undefined}
                className={`${styles.navigationItem} ${label === activePage ? styles.activeItem : ""}`}
                href={
                  label === "Events"
                    ? "/events"
                    : label === "Tasks"
                      ? "/tasks"
                      : label === "Guests"
                        ? "/guests"
                        : label === "Invitations"
                          ? "/invitations"
                          : label === "Members"
                            ? "/members"
                            : label === "Expenses"
                              ? "/expenses"
                              : label === "Vendors"
                                ? "/vendors"
                                : label === "Gallery"
                                  ? "/gallery"
                                  : label === "Livestream"
                                    ? "/livestream"
                                    : label === "Notifications"
                                      ? "/notifications"
                                      : label === "Issues"
                                        ? "/issues"
                                        : "/dashboard"
                }
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

function SidebarContents({
  activePage,
  weddingTitle,
  memberName,
  roleLabel,
}: {
  activePage: string;
  weddingTitle: string;
  memberName: string;
  roleLabel: string;
}) {
  return (
    <>
      <BrandLink />

      <div className={styles.weddingPicker}>
        <span className={styles.weddingInitials}>
          {weddingTitle.slice(0, 1).toUpperCase()}
        </span>
        <span className={styles.weddingPickerText}>
          <span className={styles.weddingPickerLabel}>Wedding workspace</span>
          <span className={styles.weddingPickerName}>{weddingTitle}</span>
        </span>
      </div>

      <NavigationItems activePage={activePage} />

      <div className={styles.sidebarBottom}>
        <SignOutButton />
        <Link
          href="/settings"
          aria-current={activePage === "Settings" ? "page" : undefined}
          className={`${styles.navigationItem} ${activePage === "Settings" ? styles.activeItem : ""}`}
        >
          <Settings2 aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>Settings</span>
        </Link>
        <div className={styles.memberCard}>
          <span aria-hidden="true" className={styles.memberAvatar}>
            {memberName.slice(0, 1).toUpperCase()}
          </span>
          <span className={styles.memberText}>
            <span className={styles.memberName}>{memberName}</span>
            <span className={styles.memberRole}>{roleLabel}</span>
          </span>
        </div>
      </div>
    </>
  );
}

export function WorkspaceShell({
  children,
  searchQuery = "",
  activePage = "Dashboard",
  weddingTitle = "Wedding workspace",
  memberName = "Member",
  roleLabel = "Wedding member",
}: {
  children: ReactNode;
  searchQuery?: string;
  activePage?: string;
  weddingTitle?: string;
  memberName?: string;
  roleLabel?: string;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <SidebarContents
          activePage={activePage}
          weddingTitle={weddingTitle}
          memberName={memberName}
          roleLabel={roleLabel}
        />
      </aside>

      <div className={styles.mobileHeader}>
        <BrandLink />
        <details className={styles.mobileMenu}>
          <summary aria-label="Open workspace navigation">
            <Menu aria-hidden="true" size={20} />
          </summary>
          <div className={styles.mobileMenuPanel}>
            <SidebarContents
              activePage={activePage}
              weddingTitle={weddingTitle}
              memberName={memberName}
              roleLabel={roleLabel}
            />
          </div>
        </details>
      </div>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className={styles.topbarActions}>
            {activePage === "Dashboard" && (
              <form
                action="/dashboard"
                className={styles.searchBox}
                role="search"
              >
                <button aria-label="Search dashboard" type="submit">
                  <Search aria-hidden="true" size={16} />
                </button>
                <input
                  aria-label="Search current dashboard items"
                  defaultValue={searchQuery}
                  name="q"
                  placeholder="Search this dashboard"
                  type="search"
                />
                <kbd>Enter</kbd>
              </form>
            )}
            <NotificationBell />
            {activePage === "Dashboard" && (
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
                    Your dashboard shows the wedding data your current role can
                    access.
                  </p>
                  <span>Reload the dashboard to refresh its snapshot.</span>
                </div>
              </details>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
