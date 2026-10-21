# Guests and families — Stitch refinement prompt

## Review

Reviewed the four approved documents and the actual preview/HTML of Stitch screen
`b6f9f88d6e0e404aa2b99c0bb5fd41cf` (Guest Management & RSVP) on 19 October 2026.
The Editorial Sanctuary palette and typography fit the application. The current
design mixes later work and excluded features with guest management: accommodation,
transportation, seating, WhatsApp, and editable per-event access. Its retrieved
preview also has large blank sections, crowded columns, and awkward text wrapping.
No separately named mobile guest design appears in the current screen inventory.

This prompt defines design scope, not approval of unresolved behavior below.

## Implementation follow-up — 19 October 2026

The user approved archive/restore, explicit duplicate keep-both review, and blocking
family deletion until guests are reassigned/ungrouped. Refined desktop screen
`e974a153210c4a00b6aeaee45a0b879f` and mobile screen
`41c835f1ebee4902b92a434e1bb1ed9d` were retrieved and inspected. The first slice
implements their ledger/card direction with functional forms and states in the
existing workspace shell. The decisions section below records the original review;
the implemented contracts are now documented in the API design and build tracker.
Guest-flow live acceptance remains pending.

## Paste into the existing Make My Marriage Platform Stitch project

```text
Refine Guest Management & RSVP into a focused Guests & Families first slice for
Make My Marriage. Use the existing Editorial Sanctuary theme, Newsreader headings,
Plus Jakarta Sans interface text, plum/ivory palette, and implemented workspace
navigation. Sidebar label: Guests. Keep Members separate: Members are authenticated
collaborators; guests are attendees who do not create accounts.

Create clearly named desktop and mobile screens with tablet adaptation:

1. Guests list
- Populated, empty, loading, fetch-error/retry, no-results, permission-denied states.
- Search by name, phone, or email. Filters for family, bride/groom/both/other side,
  and relationship. Provide sorting and server-paginated navigation for 500–2,000
  guests; never imply the entire list must be loaded into the browser.
- Show each person's name, optional contact, family, relationship, and side.
- Show data-driven guest/family counts. Do not call an RSVP confirmation attendance.
- Guests without a family or contact details are valid. Show readable missing-value
  labels. Long names/emails must wrap without breaking the layout.
- Design read-only VIEW_GUESTS access separately from MANAGE_GUESTS controls.

2. Add/edit guest and guest details
- Required name; optional phone, email, family, relationship, side, and private notes.
- Include guest type: Primary, Companion, Child, Other. Every attendee, including
  children/companions, has a separate guest record; do not use an unexplained
  number-of-people field to create anonymous headcount.
- Support selecting an existing family or creating one through a clear flow.
- Preserve form values after validation/network errors. Include saving, success,
  failed-save, and stale-edit/reload states. Collapse optional details on mobile.
- Guest details show actual fields, family members, and edit/archive actions where
  authorized. Private notes/contact details never become public by implication.

3. Families/households
- List/group guests by family with correct counts and an ungrouped-guests section.
- Create/edit family: name, optional side, notes, optional primary-contact guest.
- Family names may repeat. A family primary contact must belong to that family.
- Add another person as a separate guest in the selected family; make it clear this
  is not an invitation to become a workspace collaborator.
- Show a blocked family-removal state when guests remain, with a way to reassign or
  ungroup them first. Never imply deleting a family automatically deletes people.

4. Possible duplicate warning
- Before creating/saving a likely duplicate, show tenant-scoped possible matches
  and readable reasons, such as shared contact or matching name/family.
- Offer review existing guest, return to editing, and explicit keep-both confirmation.
- Shared phone/email and identical names can be legitimate; do not show them as
  unconditional uniqueness errors. Do not invent an automatic merge workflow.

5. Archive/removal proposal
- Design archive confirmation, archived-list filtering, and restore states as the
  proposed safe removal behavior, subject to implementation-policy confirmation.
- Explain effects in plain language; do not promise how future invitation/RSVP
  records behave until their lifecycle contract is finalized.

Keep one consistent add/edit flow across empty/populated lists. Desktop tables
become readable mobile cards. Avoid wide multi-column tables next to a permanent
details drawer. No blank panels, clipped text, or horizontal document overflow.
Use accessible labels, visible focus, keyboard-friendly controls/dialogs, managed
focus, minimum 44px touch targets, and clear destructive-action confirmation.
Keep design simulation controls in separately labeled preview panels.

Exclude CSV/Excel import, export, guest invitation generation/delivery, RSVP forms
or manual RSVP edits, WhatsApp, dietary-management additions, VIP entitlements,
accommodation/rooms, transportation/shuttles, seating, check-in, billing, AI claims,
and sample notification/storage statistics from this slice. Do not add buttons that
imply these features work. All guests are invited to every event in V1; remove
per-event invitation/access selection. Guest links will use opaque tokens later,
not guessable name-based invitation URLs. Do not redesign other modules.
```

## Decisions before implementation

- **Removal:** API says DELETE; database defines ACTIVE/ARCHIVED but does not specify
  deletion semantics. Recommend archive/restore with retained references; confirm
  link/RSVP effects before those modules are introduced.
- **Duplicates:** documents require warnings and mention create/merge, without a
  merge contract. Recommend review existing or explicitly keep both; defer merge.
  Define bounded normalization/matching rules and server-validated confirmation.
- **Headcounts:** PRD lists number of people; database/API require individual guest
  records. Recommend derive household totals from individual records.
- **Families:** specify primary-contact updates when a guest moves/is archived.
  Recommend blocking family deletion until members are reassigned/ungrouped and
  clearing invalid primary-contact references atomically.
- **Contracts:** settle guestType/source defaults, field limits, phone normalization,
  pagination/sort contract, optimistic concurrency, and archive permissions. Source
  and tenant identity must come from the server. VIEW_GUESTS/MANAGE_GUESTS are the
  existing permission boundary; family management can share MANAGE_GUESTS.
- **Ownership:** keep guest/family behavior together in modules/guests initially;
  expose the documented /api/v1/guests and /api/v1/families thin Route Handlers.
  No separate service or dependency is needed just to group guests.

The design review makes no changes to application code or the Stitch project.
