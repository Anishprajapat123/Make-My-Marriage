# Expenses and Budget — Stitch refinement prompt

## Implementation follow-up — 21 October 2026

Submitted this prompt directly to Stitch. Retrieved and inspected actual desktop
screen 850e5e8072ce4304b222d6bf4789df71 and mobile screen
595b9a3955214e4a9b75f150b0156e35 screenshots and HTML. User approved INR,
one full payment, no partial/correction/refund flow, unset budget and protected
paid entries with unpaid archive/restore. First implementation adapts the ledger
and cards into the existing shell, excludes preview controls/fake data/budget CTAs,
and documents its canonical contracts in the API/database designs. The decisions
below record the earlier preparation and are superseded by those approved
first-slice contracts where applicable. Live user acceptance remains pending.

## Preparation

Reviewed PRD section 14, System Design expense flow/permissions, Database Design
expenses collection and money rules, and API Design sections 20–21. Stitch lists
one desktop Expenses & Budget Tracker screen (`c37f94db20cf45efadd1f355b1c6ec87`)
and no separately named mobile expense screen. Screen details report 2560 × 3840.
This preparation uses the documents and screen inventory; the actual visual
preview/HTML has not been inspected in this step. Do not claim visual approval.

## Paste into the existing Make My Marriage Platform project

```text
Refine Expenses & Budget Tracker for Make My Marriage using the existing Editorial
Sanctuary theme: Newsreader headings, Plus Jakarta Sans interface text, plum/ivory
palette, and implemented workspace navigation. Sidebar label: Expenses.

Create clearly named desktop and mobile screens with tablet adaptation. This is
private wedding spending tracking, not SaaS billing or a payment-processing app.

1. Expense overview and list
- Populated, empty, loading, failed-fetch/retry, no-results and permission-denied.
- Search by expense title; filters for category, event and financial state, with
  sorting and server-paginated navigation. Optional references can be absent.
- Show title, category, amount, event where present, financial state, optional due
  date and payer. Keep mobile cards readable; no horizontal document overflow.
- Financial states: Estimated, Committed, Paid. Show overdue as a derived due-date
  indicator, not a financial state. Do not invent a Partially Paid status yet.
- Data-driven totals only. Distinguish paid spending from estimated/committed
  amounts. If a wedding budget has not been set, show Budget not set, not zero or
  a fake remaining-budget percentage. Budget editing is deferred pending contract.
- INR first-slice design, formatted with Indian grouping and up to two decimals;
  do not add exchange rates or a multi-currency selector.

2. Consistent add/edit expense form
- Required title, category, amount, financial state.
- Categories: Venue, Catering, Decoration, Photography, Clothes, Jewellery,
  Invitations, Makeup, Entertainment, Gifts, Miscellaneous.
- Optional existing event, payer (existing member OR external payer name), due
  date/time in wedding timezone, and private notes.
- Vendor module is not implemented. Do not insert invented vendor options or add
  a working vendor-management CTA. Leave vendor integration for a later slice.
- Preserve values on failure; include validation, saving, failed-save and stale
  edit/reload states. Collapse optional details on mobile.
- Paid state is a design proposal until the payment contract is settled; do not
  imply that an editable status alone creates an audited payment transaction.

3. Expense details
- Readable actual fields and authorized actions, including missing optional values.
- Read-only VIEW_EXPENSES access is separate from MANAGE_EXPENSES editing and
  MANAGE_PAYMENTS payment-record actions. Hide unauthorized controls and provide a
  clear access-restricted page without exposing amounts to unauthorized members.
- Design a proposed Record payment confirmation with amount, paid date/time,
  method and optional notes, clearly labeled as manually recording money already
  paid outside this app. Payment methods are subject to contract confirmation.
- Do not add Pay now, card entry, bank login, checkout or online money transfer.
- Include payment save/error/stale/retry states without implying double payments.
  Partial payments, corrections and refunds require a separate policy decision.

4. Safe removal
- Show proposed archive confirmation and retained history; don't imply permanent
  deletion of payments. Expense removal with payment records needs an explicit
  blocked state until the lifecycle contract is confirmed.

Responsive/accessibility
- Consistent add/edit flow in empty and populated lists. Mobile cards replace wide
  tables. Minimum 44px touch targets, visible focus, labels, keyboard-friendly
  dialogs, managed focus, wrapped long titles and helpful inline errors.
- Keep financial examples within design previews only; no fake production totals.

Exclude receipt/file uploads, import/export, subscriptions, billing, payment
gateways, financial advice, refunds, tax calculations, bank integrations, automatic
email/WhatsApp reminders, automated budget alerts and advanced reports. No seating,
transportation or accommodation. Do not redesign other modules.
```

## Contract gaps to settle before coding

- API examples use `status` and `paidByUserId`; the database defines
  `financialState`, `paidByMemberId` and optional `paidByName`. Prefer database
  names and membership references, but explicitly reconcile the API before use.
- PRD/API show total budget and remaining budget; wedding model/database currently
  have no budget field or edit endpoint. Define ownership and permission first;
  defer input and show unset until then. Remaining is budget minus paid spending,
  not budget minus estimates; define committed/pending overlap clearly.
- Payment routes accept amounts and imply partial payments, but the database has
  no payment collection/history contract. Decide partial payments, payment
  revisions, correction/void behavior, idempotency and derived financial states.
  Do not store two independently editable sources for paid totals.
- Decimal128 is mandated. Define positive bounded amounts, exact decimal string
  API values, two-decimal INR validation and exact arithmetic; no float rounding.
- Specify archive versus DELETE and retention of payment history. Do not silently
  approve either while authoring a design prompt.
- Define creation/payment idempotency and revision requirements, event/member
  reference checks and due-time behavior in the wedding timezone. Preserve linked
  event deletion guards. Decide totals for filters versus wedding-wide summary.
- Existing permissions: VIEW_EXPENSES, MANAGE_EXPENSES, MANAGE_PAYMENTS. Family
  Admin currently reads expenses without editing; Finance Manager and Owner have
  write/payment permissions. Don't silently broaden roles or public access.
- No paid infrastructure or new dependency is needed for this first slice.

These are preparation recommendations, not newly approved implementation rules.
