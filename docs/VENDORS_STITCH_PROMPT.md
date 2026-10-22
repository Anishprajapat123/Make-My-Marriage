# Vendors — first-slice design prompt

## Review — 22 October 2026

Reviewed vendor requirements in the PRD section 20, database section 19, API
sections 22–23 and the system design's tenant, vendor and storage boundaries.
The existing Stitch project contains 31 screens, with no named Vendors screen.
This handoff prepares the next slice; no vendor functionality is implemented.

## Implementation follow-up — 22 October 2026

Retrieved and visually inspected desktop screen `cd7d7227e06f4c64aaa3521d437e5ae6`
and mobile screen `1a8e3803bc684fb38c45d4002b2a5fc4`, plus desktop HTML. Implemented
their editorial directory/card direction in the existing shell, with functional
forms, details, search/filters, server pagination and archive/restore. Design-only
sample data, vendor imagery, preview controls and independent monetary balances
are omitted. Expense linking and permission-gated linked totals follow the approved
defaults. The user subsequently reported manual verification completed; independent
automated browser/security acceptance remains pending. Build checks are recorded in
BUILD_TRACKER.md. The original review above describes the pre-design state.

## Paste into Make My Marriage Platform

```text
Design Vendors for Make My Marriage using the existing Editorial Sanctuary theme,
Newsreader headings, Plus Jakarta Sans interface text, plum/ivory palette and
implemented workspace navigation. Match Events, Tasks and Expenses. Create clearly
named desktop and mobile screens with tablet adaptation. Sidebar label: Vendors.

First slice: a private wedding vendor directory and optional links from expenses.
Vendors are supplier records; adding one does not create an account or invitation.

1. Vendor list
- Populated, empty, loading, fetch-error/retry, no-results and access-denied states.
- Search name/contact; filter category, assigned event and active/archived records.
- Server-paginated list, sorting and actual data-driven counts.
- Show name, category, contact person, optional phone/email and assigned events.
- Desktop rows become mobile cards; wrap long names/emails without overflow.
- Separate read-only VIEW_VENDORS from management controls requiring MANAGE_VENDORS.

2. Add/edit vendor
- Required name and category. Offer Venue, Photographer, Caterer, Decorator,
  Makeup artist, Mehendi artist, DJ, Band, Pandit, Invitation provider and Other.
- Optional contact person, phone, email, service description, multiple wedding
  events and private notes. Missing contact/event details are valid.
- Preserve entered values after failure. Include validation, saving, failed-save,
  stale-edit/reload and success states. Collapse optional details on mobile.
- Do not treat shared contact details or matching names as uniqueness errors.
- One consistent form from empty and populated lists.

3. Vendor details
- Show real fields, assigned events and authorized edit/archive actions.
- Private contacts/notes are never public.
- Proposed financial section appears only with VIEW_EXPENSES: linked Estimated,
  Committed-unpaid and Paid expense totals in INR, with clear labels. Zero linked
  expenses is an empty state, not a fabricated contract amount or balance due.
- Hide financial data and expense navigation without expense permission.
- Do not introduce independently editable vendor payment totals.

4. Archive/restore proposal
- Clear confirmation and consequences; preserve history and linked expenses.
- Archived vendors remain readable where authorized but are not selectable for
  new expense links. Restoring does not create an account or change payments.
- Include failed action and stale-record/reload states.

5. Expense integration
- Extend the existing unpaid expense add/edit form with an optional vendor picker.
- Support no vendor, loading, no vendors, failed choices/retry and unavailable
  linked vendor states. Do not expose private vendor contact details in the picker.
- Paid expenses stay protected from editing, including changing their vendor.
- Do not add a duplicate payment form inside Vendors.

Accessibility: visible focus, accessible labels, keyboard dialogs with managed
focus, minimum 44px touch targets, no horizontal document overflow. Use clear
inline errors. Keep simulated states outside production screens.

Exclude vendor login/invitations, contracts/documents/uploads, independent vendor
payment entry, partial payments/refunds, payment gateways, budget editing, ratings,
marketplaces, messaging/email sending, billing, seating, accommodation, transport,
check-in and invented statistics. No nonfunctional buttons for deferred features.
```

## Approved defaults — 22 October 2026

The user approved canonical `category`, archive/restore preserving expense links,
financial totals derived only from linked expenses and gated by VIEW_EXPENSES,
and no vendor-account directory access until vendor-specific access is designed.

## Contract notes for implementation

- Canonical `category` matches database/PRD; API currently calls it `type`.
- Prefer archive/restore with revisions, preserving linked expenses, over DELETE
  removing financial references. Defer COMPLETED workflow until semantics exist.
- Prefer linked-expense aggregates over stored paid/balance totals. These totals
  describe recorded expenses, not a vendor contract balance. Require VIEW_EXPENSES.
- Existing VENDOR system role grants VIEW_VENDORS but has no vendor-record binding.
  Prevent directory access for vendor-role accounts until scoped vendor access is
  designed; do not silently migrate every wedding or infer ownership from email.
- Expense vendor selection needs a minimal tenant-scoped lookup authorized for
  expense editors; full directory/contact access remains separately protected.
- Validate active same-tenant references transactionally; retain archived labels
  on historical expenses. Paid expense links cannot be edited.

The four defaults above are approved. Remaining detailed contract notes are
implementation recommendations; no roles or application behavior changed here.
