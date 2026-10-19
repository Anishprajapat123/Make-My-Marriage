# Wedding members and invitations — Stitch prompt

Paste the following into the existing **Make My Marriage Platform** Stitch project.
This slice is for authenticated wedding collaborators, separate from guest
invitations and RSVP. These designs are needed before implementation.

```text
Design Wedding Members & Invitations for Make My Marriage using the existing
Editorial Sanctuary theme, typography, plum/ivory palette, and current workspace
navigation. The sidebar label is Members. Match the implemented Events and Tasks
screens. Create clearly named desktop and mobile screens with tablet adaptation.

Scope: invite real collaborators to one wedding workspace, assign existing roles,
accept invitations, and manage membership access. Do not redesign other modules.

1. Members list
- Show real-data-driven counts, name, role chips, and membership status.
- Membership statuses: Active, Suspended, Removed. Retain removed history.
- Search by name/email where permitted, filter by status/role, and paginate.
- Distinguish the current user and wedding owner clearly.
- Provide populated, owner-only/empty-team, loading, fetch-error/retry, no-results,
  and permission-denied states. Do not show invented people as production data.
- Privileged member management requires server-verified MANAGE_MEMBERS permission.
  For other members, show a concise access-restricted state without directory data.

2. Invite collaborator
- Email address, existing role selection, and a readable explanation of the role's
  access. Support displaying multiple role chips; do not build custom-role editing.
- Family Member access explanation: sees assigned tasks and can update their
  status/checklist completion, without wedding-wide task access.
- Show required-field/email/role validation, submitting, success, and failure.
- Provide a distinct invitation-created state and, only when delivery is confirmed,
  an email-sent state. Never equate invitation creation with successful delivery.
- Allow a copy-link confirmation design without claiming that stored invitation
  tokens can be retrieved later. Link creation/delivery policy will be finalized
  before implementation. Do not render secret tokens in tables or audit history.
- Show duplicate pending invitation and already-a-member outcomes without exposing
  another wedding's identity or private membership details.

3. Invitations tab
- Keep invitation records separate from member records: inviting someone does not
  create membership or reserve their account's wedding slot.
- Show invitee email, offered roles, inviter, expiry, and invitation status:
  Pending, Accepted, Revoked, Expired.
- Include revoke confirmation and replacement-invitation states for revoked or
  expired links. A replacement invalidates the previous token; do not imply a
  reusable permanent acceptance link. Do not choose a fixed expiry duration.
- Include request failure, stale-record/reload, and permission-denied states.
- Retain historical records rather than implying that expiry deletes them.

4. Invitation acceptance journey
- A focused page separate from the authenticated workspace navigation.
- Before authentication, show a generic invitation message, Sign in, and Create
  account. Avoid exposing private wedding/member information to anonymous users.
- Preserve the invitation journey through registration, email verification, and
  sign-in. Local accounts must verify email before signing in.
- After authenticated validation, show the wedding identity, invited account,
  offered role/access summary, and an explicit Accept invitation action.
- Successful acceptance opens the joined wedding workspace; it must not launch
  Create wedding onboarding or create a second wedding.
- Include loading, accepting, success, network failure/retry, invalid, expired,
  revoked, already accepted, wrong signed-in email, and already-in-another-wedding
  states. Wrong-account state offers a safe sign-out/switch-account path.
- Explain generically that an account with an Active or Suspended wedding
  membership cannot join another wedding. Do not reveal the other wedding.
- An account with only Removed memberships can accept a new invitation.
- No anonymous acceptance, guest account flow, or automatic joining on page load.

5. Manage member access
- Existing-role selection with a clear access summary; display all current roles.
- Suspend, restore, and remove actions have clear consequences and confirmation.
- Suspension blocks workspace access and retains membership. Removal retains
  history; the person may later join another wedding.
- Historical tasks/comments/activity remain attributed; do not imply their deletion
  or automatic reassignment when a member is removed.
- Show stale-edit/reload and failed-save states.
- Design a protected-owner state explaining why an action is unavailable. Do not
  add ownership transfer, self-removal, or ownership-grant flows in this slice.
  Exact owner-management restrictions will be finalized before implementation.

Responsive/accessibility requirements
- Desktop tables become readable mobile cards without losing essential fields.
- Use accessible labels, visible focus, keyboard navigation, minimum 44px touch
  targets, properly managed dialog focus, and clear destructive confirmations.
- Avoid horizontal document overflow; wrap long emails and role names.
- Use one consistent invite flow from empty and populated states. Collapse optional
  explanations on mobile where helpful, while keeping essential actions visible.
- Show inline errors and preserve entered values after failed requests.
- Any simulated state controls belong in separately labeled design-preview panels,
  never inside production screens.

Exclude custom-role creation/editing, ownership transfer, guest invitations/RSVP,
billing, subscriptions, seating, transportation, accommodation, check-in, WhatsApp,
and any claims about features outside this slice.
```

## Implementation decisions — 16 October 2026

- **Roles:** approved multiple existing roles using `roleIds[]`. API mutation
  examples now match the database and preserve existing multiple-role assignments.
- **Delivery and expiry:** approved SES email plus a copyable link, expiring after
  seven days. Creation and SES acceptance are reported separately. Replacement
  invalidates the old link and creates a new token; raw links are returned only
  when created/replaced and are never reconstructed from stored hashes.
- **Owner protection:** the user delegated safe policy selection. Owner memberships
  and self-access edits are protected; ownership grants/transfers remain excluded.
  Non-owner managers cannot grant or manage permissions beyond their own.
- **API lifecycle:** listing, cookie-held authenticated lookup, revoke/replace,
  suspend/restore/remove, and `updatedAt` concurrency contracts are documented in
  the API design alongside the original member endpoints.
- **Acceptance:** verified invited email, transactional token consumption, and the
  one-current-membership constraint are enforced. Same-account repeat acceptance
  with active membership is idempotent. Rejoining the same wedding reactivates the
  retained removed row, preserving task/comment references.

Stitch supplied desktop/mobile member-list screens. The first implementation
extends their theme to invitation, access-management, and acceptance UI. Development
multi-account, responsive-browser, and one authorized SES inbox-delivery check were
completed on 19 October 2026; see `MEMBERS_QA_REVIEW.md` for scope and limitations.
