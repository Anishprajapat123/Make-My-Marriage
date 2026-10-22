# Issues & Problem Reporting — Stitch prompt

## Review — 22 October 2026

Reviewed PRD section 22, system design module/access boundaries, database issues
and issue_comments collections, and API section 27. Stitch inventory has 35
screens with no named Issues screen. No Issues application code is implemented.

## Implementation follow-up — 22 October 2026

Inspected desktop `df29fb69e22a46e397b1899f447fbdf5` and mobile
`4e81922cf22c4da9aa1fc2d7caac1d6a` screenshots. Implemented the list/card, details
and discussion direction in the existing shell, removing sample imagery,
attachment-style controls, invented metrics and preview controls. The first slice
includes report/edit, planner assignment, explicit resolve/reopen/status actions,
scoped counts/filters, paginated comments and a separate immutable action history.
Reporter-only members have no edit/status controls; vendor roles remain own-scoped.
Browser/live acceptance remains pending; see BUILD_TRACKER.md for build checks.

## Paste into the existing Make My Marriage Platform project

```text
Design Issues & Problem Reporting for Make My Marriage, matching the existing
Editorial Sanctuary theme, Newsreader headings, Plus Jakarta Sans interface text,
plum/ivory palette, and implemented workspace shell. Sidebar: Issues. Generate
clearly named desktop and mobile screens with tablet adaptation.

Keep this slice focused on wedding problems, not a general support desk or another
task planner. Reporting a problem does not create a task or notify guests.

1. Issues list
- Populated, empty, loading, fetch error/retry, no-results and restricted states.
- Search title; filter status, priority, permitted event and assigned member.
- Server pagination and data-driven counts; never load all records for counts.
- Statuses Open, In progress, Resolved. Priorities Low, Medium, High, Urgent.
- Show title, priority, status, reporter, optional assignee/event and created time.
- Desktop rows become readable mobile cards; long titles wrap without overflow.

2. Report issue
- Required title/description; optional event/vendor when permitted, priority.
- Reporter comes from the signed-in member, never an editable identity selector.
- Support unlinked issues and missing contact/event data; preserve form values
  after validation/network errors. Show submitting, success and failed-save states.
- Same reporting flow from empty and populated screens.
- Reporter-only view must not expose full member, vendor or event directories via
  pickers. Optional references can be omitted when lookup permission is unavailable.

3. Issue details and comments
- Clear description, status/priority, reporter, optional assignee/event/vendor,
  created/resolved timestamps in wedding timezone and a paginated comments area.
- Plain text comments, composing, submitting, failure/retry and empty discussion.
- Show real permitted fields only. No fabricated people, activity or statistics.
- Separate comments from immutable activity history; no comment edit/delete yet.
- Do not expose private vendor contacts/notes or unrelated wedding records.

4. Planner management
- VIEW_ISSUES grants wedding-wide reads to authorized non-vendor collaborators.
- MANAGE_ISSUES plus VIEW_ISSUES allows edit, assignment to an active member with
  appropriate issue access, status/priority changes, resolve and reopen.
- Clear confirmations for resolve/reopen; resolution retains history/comments.
- Include stale edit/reload, failed save and permission-changed states.
- No hard deletion or archive workflow in this slice.

5. Reporter-only experience
- REPORT_ISSUES without wedding-wide view permits creating reports and reading/
  commenting only on one's own reports. Label the view My reported issues.
- Hide assignment, global counts, other people's reports and management controls.
- Reporter identity and ownership are enforced on the server.
- Vendor-role accounts have no general issue-directory access; if allowed to
  report, their view is restricted to their own reports. No vendor portal yet.
- A removed/suspended member cannot continue accessing the old wedding's issues.

Accessibility/responsiveness: accessible labels, visible focus, 44px minimum touch
targets, keyboard-friendly dialogs, managed focus, no horizontal document overflow.
Keep essential actions visible on mobile and collapse optional fields where useful.
Simulation controls stay in separately labeled design-preview panels only.

Exclude attachments/uploads, emails, WhatsApp, billing, AI claims, vendor portal,
scheduled reminders, automatic task creation, custom statuses, SLA timers, seating,
accommodation, transport, check-in, and nonfunctional buttons for future features.
```

## Approved access/lifecycle defaults

User approved on 22 October 2026: planners manage all issues; REPORT_ISSUES-only
members read/comment on their own reports; vendor-role accounts do not receive a
general directory; resolve/reopen retains history; no deletion in the first slice.
Represent planner management using the existing VIEW_ISSUES + MANAGE_ISSUES keys.

## Implementation contract notes

- Tenant + ownership/permission filters must apply to reads, counts, comments,
  reference lookups and mutations. Broad VENDOR grants must not bypass own scope.
- Keep domain logic in modules/issues and thin handlers under /api/v1/issues.
  Reporter IDs come from server context. Use revisions for edits/status transitions,
  retry-safe create/comments, bounded plain-text fields and cursor/page limits.
- Validate references transactionally. Assignees must have access to the issue;
  REPORT_ISSUES-only members cannot be assigned another person's report merely
  because they are active members. Preserve historical author attribution.
- Existing API DELETE is deferred in favor of explicit resolve/reopen. Keep separate
  issue_comments and activity records; do not silently delete linked information.
- Source documents do not define own-report edit privileges, assignment grants or
  exact field bounds. Keep reporter-only access to report/read/comment initially;
  settle limits and manager permissions before implementation.
- Notification triggers for issue events are deferred; the current task-assignment
  inbox is not a generic broadcast channel. No paid service/dependency is needed.
