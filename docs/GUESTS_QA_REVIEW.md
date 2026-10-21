# Guests & Families verification — 21 October 2026

## Automated foundation

The unit/security/component suite has 73 passing checks across ten files, including
new guest boundary/service checks and both UI review regressions. Lint and type
checking pass.

## Results

- All 73 unit/security/component checks pass across ten files.
- The isolated live production-browser journey passes (about 1 minute 20 seconds).
- Desktop/tablet/mobile overflow assertions pass. The guest-create mobile view,
  populated desktop/mobile ledger, and mobile families view were visually inspected.
- Live cleanup reports zero remaining users, weddings, guests and families for the
  completed run. No real email was sent or personal account/wedding data changed.
- Preliminary live failures were test-locator mismatches (phone helper text and
  status-select label), corrected in the test. No application-code changes were
  required by the completed walkthrough.

## Live walkthrough scope

`tests/e2e/guests-flow.spec.ts`, selected by `playwright.guests.config.ts`, uses the
existing isolated standalone production fixture server on port 3101. It does not
reuse the user's signed-in browser or development server. Email configuration is
disabled in that server and the startup guard refuses enabled email configuration.

The test seeds five verified QA accounts with random in-memory passwords, creates
two temporary weddings through the onboarding API, and seeds explicit read-only,
denied and suspended membership fixtures. It does not test registration or email
delivery again; those belong to the separate authentication/Members verification.

Checks include:

- Anonymous denial; actual separate-session owner/read-only/denied/suspended access.
- Tenant-scoped reads/writes and rejection of foreign family/contact references,
  forged tenant input, foreign browser origins and non-JSON mutation bodies.
- UI family creation and guest creation/details with saved contact normalization.
- Repeated active-tab clicks and switching Add person between households.
- Guest with no family/contact; legitimate repeated family names/shared contacts.
- Duplicate review, review existing guest, explicit keep-both, Enter-key protection,
  and rejection of a confirmation reused with changed input.
- Primary-contact selection; partial family/guest edits preserve omitted fields;
  moving/archiving a contact clears the reference transactionally.
- Archive/restore confirmation; retained records; populated-family deletion guard,
  including archived guests; rejection of archived edits and stale revisions.
- Stale UI edits preserve entered values; discard/reload recovery; no-results and
  injected list failure/retry states.
- Seeded 1,000-person dataset: bounded page sizes, disjoint first/last pages, side
  filtering, sort order, UI pagination and paginated family picker.
- Desktop 1440px, tablet 820px and mobile 390px screenshots and document overflow
  assertions for the principal UI states.

Generated screenshots stay in ignored `test-results/`; they contain temporary QA
identities only. No bearer tokens or passwords are captured in traces/logs.

## Cleanup

The `finally` block resolves only weddings with the current unpredictable QA marker
and removes their guest/family/activity/role/member records, then QA wedding/user/
auth-token fixtures. It checks that the run's users, weddings, guests and families
are gone before reporting `GUEST_QA_CLEANUP_CONFIRMED`. An interrupted preliminary
run was separately cleaned using only the `guests-qa-...` fixture identities.
Personal accounts and wedding data are excluded.

## Repeat locally

```powershell
npm run build
$env:RUN_GUESTS_LIVE_QA='1'
npm run test:e2e -- --config playwright.guests.config.ts
```

Use only the intended development MongoDB configuration. The opt-in test creates
temporary records in that database; it does not require account passwords in chat
or `.env.local`, and sends no email. No dependency installation is needed.

## Limits

This is development verification, not production load certification. The 1,000-guest
dataset is seeded directly to exercise reads/pagination; it is not a bulk-import
implementation. Import/export, fuzzy matching/merge, guest invitation links and RSVP
remain deferred. This does not certify production WAF/SES/AWS configuration or all
assistive technologies. Screenshots/overflow assertions supplement manual design
review; final user visual acceptance remains separate.
