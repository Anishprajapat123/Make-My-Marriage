# In-app notifications — first-slice Stitch prompt

## Review — 22 October 2026

Reviewed PRD section 19, system design section 12.3, database notifications
collection and API section 18, plus the existing task transaction and permission
boundaries. Stitch currently has 33 screens; none is named Notifications/Inbox.
The notifications module is scaffold-only. This document prepares design work;
it does not claim notification functionality is implemented.

## Implementation follow-up — 22 October 2026

Retrieved and inspected desktop `0f729de72f1645b3b5d60fa82a676621` and mobile
`9c92d91896ba4bfea502baf2291af59c` screenshots after the user confirmed designs
ready. Implemented their inbox/card direction in the existing shell, without
preview controls, invented counts, mark-all-read or unrelated supplier content.
New-assignee triggers, recipient-scoped read state and current-task authorization
follow the rules below. Browser/live acceptance remains pending. No email or
scheduled reminder functionality is implied by the implementation.

## Paste into Make My Marriage Platform

```text
Design In-app Notifications for Make My Marriage using the existing Editorial
Sanctuary theme, Newsreader headings, Plus Jakarta Sans interface text, plum/ivory
palette and current workspace navigation. Match implemented Tasks and Dashboard.
Create clearly named desktop and mobile screens with tablet adaptation.

First slice: notifications for newly assigned tasks, delivered only inside the app
to authenticated wedding members. No guest accounts or notifications.

1. Workspace bell
- Accessible bell link with unread count, including zero and 99+ visual display.
- Available in desktop and mobile workspace headers, not just Dashboard.
- Open the notification inbox; do not require a second dropdown/popover workflow.
- Show loading and unavailable/retry states without pretending a failed count is 0.
- Do not claim instant push delivery or browser/OS notification support.

2. Notification inbox
- Full page /notifications with All and Unread filters and paginated navigation.
- List readable task-assignment notifications with date/time in wedding timezone,
  clear read/unread indication and accessible actions.
- Counts and content come from actual records; examples belong to design only.
- Include populated, empty, no unread items, loading, fetch-error/retry, failed
  action/retry and suspended/permission-restricted workspace states.
- Read and mark-as-read actions affect only the signed-in recipient's records.
- Provide per-item Mark as read with a saving state; defer mark-unread, deletion,
  preferences and mark-all-read controls in this first slice.
- Opening the inbox alone must not mark everything read.

3. Open assigned task
- Open task action leads to the existing task details route.
- Task titles/details are shown only when current task access is confirmed.
- If the task was deleted, assignment removed or permissions changed, show a
  generic Task no longer available state without revealing its previous title,
  description, assignees, comments or other private data. Allow marking it read.
- Resource navigation and marking read are separate, clearly labeled actions.
- Suspended/removed membership cannot access the old wedding inbox.

4. Trigger explanation for design consistency
- Proposed behavior: notify a newly added active assignee when a task is created
  or its assignment changes. Do not notify the actor about assigning themselves.
- Unchanged assignees do not receive duplicates on ordinary edits, status changes
  or checklist updates. No retroactive notification of all existing tasks.
- A notification is not an email or a task reminder. Do not add scheduled due-date
  messaging, payment alerts or broad activity streams in this slice.

Responsive/accessibility: desktop rows become readable mobile cards; long titles
wrap without horizontal overflow. Use visible focus, accessible count/link names,
minimum 44px touch targets, keyboard navigation, readable timestamps and inline
errors. Do not rely on color alone to distinguish unread items. Keep any simulation
controls in separately labeled preview panels, never production UI.

Exclude email, SMS, WhatsApp, push subscriptions, browser permissions, scheduling,
notification preferences, guests, billing, new task creation flows, fake counts,
seating, accommodation, transport, check-in and features outside this slice.
```

## Proposed implementation rules

- Keep creation/inbox logic in modules/notifications. Task code calls a narrow
  notification operation within its existing MongoDB transaction; no queue,
  worker, Redis, paid provider or new dependency is required for assignment events.
- Atomically persist task changes and notifications. Use an idempotency key per
  assignment event/recipient so retries do not create duplicate inbox records.
- Recipient identity is recipientMemberId, resolved server-side. Every read/count/
  update includes tenantId and recipientMemberId; no client-selected recipients.
- Reuse taskScope for current resource access. Historical notification text must
  not bypass revoked assignment permissions; use generic stored content and
  authorize any task title/link enrichment before returning it to the browser.
- Prefer newly added assignees only, exclude the actor, no existing-task backfill.
  Removal and subsequent reassignment is a new event. A task edit is not a reminder.
- Use documented GET /api/v1/notifications and PATCH /:notificationId/read, with
  bounded pagination and a recipient-scoped unread count. Read-state updates are
  idempotent. Defer read-all/preferences despite their future API definitions.
- Refresh on inbox navigation/manual retry and window focus initially; no frequent
  background polling, realtime infrastructure or guarantee of instant delivery.

These detailed trigger/refresh rules are recommendations for the first slice,
not previously approved changes to the four design documents.
