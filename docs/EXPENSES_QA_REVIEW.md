# Expenses verification — 22 October 2026

## Scope and setup

Automated validation/unit/security checks and an opt-in Playwright journey target
the deployed demo, https://make-my-marriage-sepia.vercel.app. Five isolated QA
accounts cover owner, another wedding owner, read-only Family Admin, restricted
Family Member and Finance Manager. Two temporary weddings isolate records from
real user finances. QA passwords are random and stay in memory. No email is sent
and no payment gateway or financial transfer is used.

## Current results

- 100 tests pass across 11 files, including 27 new expense checks for exact INR
  arithmetic, custom/built-in category normalization, unsafe input rejection,
  required revisions/idempotency, and separate read/edit/payment permissions.
- TypeScript, lint and formatting pass.
- The deployed live walkthrough passes (2.9 minutes). Its finally block confirms
  zero remaining QA users, weddings and expenses after scoped cleanup.
- Early live attempts stopped at short hosted-response waits or test locator
  assumptions. Their finally blocks confirmed cleanup of temporary QA records.
  No product change has been required by these early failures.

## Live coverage passed

- Empty ledger, custom category creation, unchanged suggestion list, exact custom
  category filtering and escaped regex punctuation.
- Exact-money summaries; create retries and changed-body conflicts; invalid
  references, financial state and amounts; edit/stale revision handling.
- Form value preservation after simulated failed save; read-only/denied roles;
  foreign-wedding read, edit and payment rejection.
- Finance Manager records a full external payment; partial/future payments fail;
  payment retries are idempotent and Paid entries remain protected.
- Archive/restore and total changes; final-page archive pagination recovery;
  suspended member access rejection.
- Desktop 1440px, tablet 820px, mobile 390px screenshots/overflow assertions.

Captured 24 screenshots across eight states and three viewport sizes. Visually
inspected desktop/mobile paid ledgers and mobile expense/payment forms. No
application defect required a production-code change in this verification pass.
Hosted cold-response waits and native-control locators were adjusted in the test.

## Repeat

```powershell
$env:RUN_EXPENSES_LIVE_QA='1'
npm run test:e2e -- --config playwright.expenses.config.ts
```

The configured local MongoDB URI must point to the same demo database used by the
hosted application. This suite creates and deletes only its scoped QA records.
It requires no provider credentials, email sending, paid service or new dependency.

## Limits

This is functional demo verification, not production load testing or accessibility
certification. Google OAuth completion is previously user-verified; these fixture
accounts use verified local credentials so the expense authorization checks do not
require third-party account passwords. Google collaborator acceptance remains a
separate journey. No receipts, partial payments/refunds, budget editing or banking
integrations are included in this slice.
