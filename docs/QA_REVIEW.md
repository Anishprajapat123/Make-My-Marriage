# Local flow review — 14 October 2026

## Verified

- 20 unit/security/component tests pass.
- Live owner flow against development Atlas: failed/successful credentials login,
  existing wedding session, rejection of duplicate wedding onboarding, event
  create/read/edit/delete, timeline add/edit/delete, overnight dates, stale-write
  rejection, nonexistent-resource rejection, mobile menu navigation, and sign-out.
- Invalid registration input and invalid verification/reset tokens are rejected.
- Account screens, dashboard, Events empty/populated states, form, details, and
  timeline captured at 1440px desktop, 820px tablet, and 390px mobile. No horizontal
  document overflow. Screenshots are ignored artifacts under `test-results/`.
- Disposable test records cleaned up; supplied credentials are not stored in source.

## Changes from the review

- Corrected the cramped dashboard sample timeline layout.
- Stacked Events date groups at tablet widths to give cards usable space.
- Optional venue/guest details collapse; entered values remain in the saved record.

## Not verified by this walkthrough

- Fresh account registration with actual SES delivery and successful verification.
- Successful password recovery/reset using a delivered token and session revocation.
- Google sign-in: unavailable in the current UI/configuration.
- Fresh user onboarding, transaction rollback, and concurrent wedding creation
  against Atlas. Existing membership rejection was tested live; other onboarding
  checks currently use mocks.
- Readonly/suspended users and actual two-wedding access attempts in separate sessions.
  Service tests cover scope and permission denial with mocked persistence.
- Future modules, guest-facing published event delivery, and production WAF limits.

## Initial Tasks design review (superseded by refinement and implementation)

The desktop Tasks screenshot is accessible. Its HTML download redirects to Google
sign-in, so interaction/layout code cannot currently be inspected directly.
Visual styling matches the workspace, but transport/seating content, automated
checklists, vendor-dependent statistics, and Urgent priority require correction.
Mobile, empty states, create/edit, details/checklists/comments, and assigned-member
states are missing from the existing design set.

Approved: planners manage all tasks; family members see only tasks assigned to
their membership and update status/checklists. The database contract uses multiple
`assigneeMemberIds`; API examples currently use singular user `assigneeId`. Align
that contract with membership IDs before implementing assignment. The refined screens and implementation now follow this decision; API examples have been corrected.

## Tasks verification — 14 October 2026

- 46 unit/security/component tests pass across the repository, including 26 new Tasks cases for permissions, assigned scope, immutable checklist titles, omitted PATCH fields, bounds, tenant-scoped repository filters, native event reference locking, and UI loading/error/retry behavior.
- The opt-in live Playwright journey passes against development Atlas using two temporary weddings, two planner accounts, and one assigned family account. QA accounts are preverified fixtures; no email is sent and SES/verification lifecycle is not tested by this journey.
- Covered authenticated onboarding, empty/populated Tasks, creation with local timezone conversion, edits, planner comments, checklist/status updates, filtered results/counts, stale revision rejection, removal of task/comments, and retained audit records.
- Actual separate sessions verify cross-tenant and unassigned-resource denial for tasks/comments/activity, assigned-only create/delete/comment/field-edit denial, suspended membership rejection, and permission-denied UI. Inactive/foreign assignments and nonexistent event references are rejected. Linked events cannot be deleted until the task link is removed.
- Injected list fetch failures recover through Retry. Screenshots cover empty, populated, create/edit, details, assigned list/details, no-results, and error states at 1440px, 820px, and 390px; document overflow checks pass. Screenshots remain ignored under `test-results/`.
- Fixed event linking in a long-running development server: an older cached Mongoose event schema stripped the new guard field. A native tenant-scoped ObjectId update preserves the transactional write lock without changing event `updatedAt`.
- All test fixtures are scoped to generated QA users/weddings and cleaned in `finally`. A separate read-only check confirmed zero remaining `tasks-qa-` users/weddings. No personal-account credentials or existing wedding permissions were changed.
- Still outside this verification: exhaustive simultaneous-write/delete races, load/performance and production infrastructure, real member-invitation flow, and applying assigned-task permissions to preexisting wedding roles. New-wedding Family Member defaults were exercised live.

Run locally only with approval to create temporary development fixtures:

```powershell
$env:RUN_TASKS_LIVE_QA='1'
npm run test:e2e -- tests/e2e/tasks-flow.spec.ts --workers=1
```

The test reads `.env.local` for MongoDB configuration without printing it, creates random temporary credentials in memory, and skips unless explicitly enabled.
