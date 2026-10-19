# Members verification — 19 October 2026

## Results

- 57 unit/security/component tests pass across the repository, including 11 new
  member-policy/contract cases. Lint, TypeScript, formatting, and build pass.
- Live Atlas/Playwright checks pass using a separate standalone production server
  on port 3101, two temporary weddings, two planners, and one collaborator.
- Verified multiple-role invitation creation, hashed tokens, duplicate pending
  rejection, cross-tenant role rejection, and creation despite email-delivery failure.
- Verified registration, refusal to sign in before email verification, verification
  token consumption, preservation of the HTTP-only invitation cookie through
  sign-in, explicit acceptance, and entry into the existing wedding workspace.
- Verified read/management restrictions, owner/self protection, non-owner privilege
  escalation denial, suspension/restoration, stale versions, removal, and rejoining
  with the same historical membership ID.
- Verified wrong-email rejection, existing current-wedding conflicts, idempotent
  same-account acceptance, revoke/replace/expiry, retained invitation history,
  and simultaneous acceptance into two weddings: one succeeds, one returns 409,
  and exactly one ACTIVE/SUSPENDED membership remains.
- UI checks cover empty-team/owner-only, populated directory, invite/access forms,
  anonymous/authenticated join, denied access, search/no-results, stale-edit
  recovery, and injected fetch failure/retry at desktop 1440px, tablet 820px, and
  mobile 390px. Screenshots are ignored artifacts under `test-results/`.

## Email scope

The browser fixture server has `AWS_REGION` and `SES_FROM_EMAIL` explicitly empty,
with a startup guard, so QA invitations/registration never send emails. Registration
verification uses a known, temporary hashed token fixture to simulate receipt of
the verification link; this does not prove an actual signup email reached a mailbox.

Separately, the user approved one invitation test to their verified Gmail address.
The test created its invitation through the API, then sent its link with the SES
SDK after verifying credentials resolve to account `291786456658`, user `anish-dev`.
SES accepted the request and the user confirmed inbox receipt. This was one real
email; the application adapter's success/failure handling is covered by unit tests.
It was not a full registration-email-to-new-recipient delivery test. The temporary
wedding was removed, so the emailed QA link is intentionally no longer valid.

## Changes and cleanup

- Gave each role checkbox a concise accessible name instead of including all
  explanatory text in its name.
- Removed irrelevant Family Member migration wording from other role descriptions.
- Test fixtures use random in-memory credentials and scoped `finally` cleanup.
  A separate read-only check found zero remaining QA users, weddings, or invitations.
- No personal account or existing wedding membership was changed. No AWS
  infrastructure was modified, and no commit/push was made.

## Remaining scope

Production infrastructure, broad load/fault testing, Google-provider acceptance,
cross-browser/device coverage beyond Chromium, and actual verification-email
delivery to newly invited addresses remain separate acceptance work. SES sandbox
restrictions and existing-wedding Family Member role migrations still require
environment-specific handling. Custom-role editing and ownership transfer remain
outside this slice.

## Rerun

Build first, then explicitly opt into temporary development fixtures:

```powershell
npm run build
$env:RUN_MEMBERS_LIVE_QA='1'
npm run test:e2e -- --config playwright.members.config.ts
```

Leave `RUN_REAL_SES_MEMBER_QA` unset/zero for normal runs. Enabling it requires
fresh authorization to send the real test message; it is never enabled by default.
