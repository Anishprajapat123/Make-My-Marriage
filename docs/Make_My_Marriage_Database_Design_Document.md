# Make My Marriage
## Database Design Document

**Product:** Make My Marriage  
**Database:** MongoDB Atlas  
**Architecture:** Multi-Tenant Modular Monolith  
**Application:** Next.js + Node.js + TypeScript  
**Storage:** MongoDB Atlas + Amazon S3  
**Version:** 1.0  
**Date:** 07 October 2026

> **Approved baseline**
>
> One wedding is one tenant. A tenant owns its wedding, members, events, guests, RSVP records, tasks, expenses, vendors, invitations, notifications, gallery, livestream configuration, issues, and activity history. Users have accounts; guests do not. MongoDB Atlas uses shared collections with strict `tenantId` isolation. Photos and documents live in S3, while MongoDB stores metadata and object references. The product is free; no billing or subscription data model is required in V1. There is no automatic post-wedding deletion.

---

# 1. Purpose

This document defines the database architecture for Make My Marriage. It translates the approved product and system architecture into a concrete MongoDB data model that can be implemented by the development team.

The design focuses on:

- Multi-tenant isolation.
- Correct relationships between wedding, members, guests, events, tasks, expenses, vendors, invitations, RSVP, notifications, photos, livestreams, and issues.
- Support for approximately 500–2,000 guests per wedding.
- Efficient dashboard queries and operational workflows.
- Secure guest access without guest accounts.
- Reliable photo/document metadata management with S3 as the binary store.
- Auditability for a collaborative family workspace.
- Simple growth from one monolithic deployment to a larger SaaS platform later.

---

# 2. Core Database Principles

## 2.1 One wedding = one tenant

A wedding is the tenant boundary. Every tenant-owned document must carry a required `tenantId` that references the root `weddings` document.

```text
Tenant / Wedding
      |
      +-- Members
      +-- Events
      +-- Tasks
      +-- Guests
      +-- RSVP
      +-- Invitations
      +-- Expenses
      +-- Vendors
      +-- Notifications
      +-- Reminders
      +-- Albums / Photos
      +-- Livestreams
      +-- Issues
      +-- Activity Logs
```

## 2.2 Shared collections, strict isolation

All wedding data is stored in shared MongoDB collections. A separate database or collection per wedding is **not** used in V1.

Every tenant-owned query must begin with the authenticated tenant context, for example:

```text
{ tenantId: currentWeddingId, ...otherFilters }
```

The application must never accept an arbitrary `tenantId` from a client and trust it. The server derives the tenant from the authenticated user and membership context.

## 2.3 Avoid unbounded embedded arrays

Large or independently changing data must be separate documents rather than embedded arrays inside the wedding document.

Examples:

- Guests → separate documents.
- Tasks → separate documents.
- Photos → separate documents.
- Activity log entries → separate documents.
- Notifications → separate documents.

Small bounded structures may be embedded, such as an event's venue details or a photo's three S3 object keys.

## 2.4 MongoDB is the source of truth

Derived dashboard counters may be stored for fast reads, but they are rebuildable and not authoritative.

## 2.5 No TTL deletion

No MongoDB TTL indexes are used for wedding data. Wedding data remains available after the wedding unless a future product decision introduces an explicit retention or deletion policy.

---

# 3. Logical Database Architecture

```text
                              MongoDB Atlas
                                   |
                  +----------------+----------------+
                  |                                 |
            Global collections                Tenant collections
                  |                                 |
                users                     +---------+---------+
                                          |         |         |
                                      wedding    members    roles
                                          |
            +-----------------------------+-----------------------------+
            |            |           |          |          |             |
          events       guests      tasks     expenses    vendors      invitations
            |            |           |          |          |             |
        gallery       RSVP      comments     payments   documents   invite links
            |
       livestreams

   notifications / reminders / issues / activity_logs are tenant scoped as well.
```

---

# 4. Collection Inventory

| Collection | Scope | Purpose | Main parent / relation |
|---|---|---|---|
| `users` | Global | Login identity and profile | User account |
| `auth_tokens` | Global | Hashed, expiring email-verification and password-reset tokens | `users` |
| `weddings` | Tenant root | Wedding workspace and tenant root | Self |
| `wedding_members` | Tenant | Maps users to one wedding and their roles | `users`, `weddings` |
| `member_invitations` | Tenant | Pending invitations for people who may not have accounts yet | `weddings`, `wedding_members` |
| `roles` | Tenant | Customizable role definitions | `weddings` |
| `events` | Tenant | Wedding ceremonies/events | `weddings` |
| `tasks` | Tenant | Planning and execution tasks | `events`, `weddings`, `wedding_members` |
| `task_comments` | Tenant | Task discussion | `tasks` |
| `guest_families` | Tenant | Groups guests into families/households | `weddings` |
| `guests` | Tenant | Individual guest records | `guest_families` |
| `rsvps` | Tenant | Guest response | `guests`, `weddings` |
| `invitations` | Tenant | Wedding invitation content/configuration | `weddings` |
| `invitation_links` | Tenant | Personalized guest invitation URLs | `guests`, `invitations` |
| `expenses` | Tenant | Wedding expense records | `events`, `vendors`, `wedding_members` |
| `vendors` | Tenant | Vendor/service providers | `events` |
| `vendor_documents` | Tenant | Vendor contracts and documents | `vendors` |
| `notifications` | Tenant | In-app notifications | `wedding_members` |
| `reminders` | Tenant | Scheduled task/event/payment reminders | tenant resource |
| `gallery_albums` | Tenant | Event-based photo galleries | `events` |
| `photos` | Tenant | Photo metadata and S3 object references | `gallery_albums` |
| `livestreams` | Tenant | Event livestream configuration | `events` |
| `issues` | Tenant | Wedding problem/issue reports | `events`, `vendors`, `wedding_members` |
| `issue_comments` | Tenant | Issue discussion | `issues` |
| `activity_logs` | Tenant | Important change history | tenant resource |

---

# 5. Entity Relationship Overview

```text
users
  |
  | 1
  |---------< wedding_members >---------1 weddings
                                           |
                +--------------------------+------------------------------+
                |                          |                              |
                v                          v                              v
              events                 guest_families                    roles
                |                          |
        +-------+---------+                +------< guests >------1 rsvps
        |       |         |                         |
        v       v         v                         v
      tasks   vendors   gallery_albums      invitation_links
        |       |            |
        v       v            v
  task_comments vendor_documents  photos

weddings <--- expenses ---> vendors / events / wedding_members
weddings <--- reminders / notifications / issues / activity_logs
weddings <--- invitations
issues <--- issue_comments
```

There is intentionally **no `event_guests` collection** in V1 because the approved product rule is that everyone is invited to every event.

---

# 6. ID Strategy

## 6.1 Internal IDs

Use MongoDB `ObjectId` for internal document identifiers.

Example:

```json
{
  "_id": "ObjectId(...)"
}
```

## 6.2 Public identifiers

Do not expose raw MongoDB IDs as the primary identifier for public guest invitation URLs.

Use:

- A human-friendly wedding `slug` for the public wedding page.
- An opaque, high-entropy invitation token for personalized guest links.

Example:

```text
/wedding/anish-priya
/invite/<opaque-token>
```

## 6.3 Token storage

Store only a secure hash of the invitation token in MongoDB. The raw token is used by the URL but is not stored as plaintext in the database.

---

# 7. `users` Collection

Global authentication identities. This collection is not tenant-scoped because the user account represents a login identity.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | User ID |
| `email` | string | Yes | Lowercased/normalized; unique |
| `emailVerifiedAt` | Date/null | No | Verification timestamp |
| `passwordHash` | string/null | No | Present for email/password accounts |
| `authProvider` | enum | Yes | `LOCAL`, `GOOGLE` |
| `googleSubject` | string/null | No | Provider account identifier |
| `displayName` | string | Yes | Profile name |
| `avatarUrl` | string/null | No | Optional external avatar |
| `phone` | string/null | No | Optional profile data; not used for OTP |
| `status` | enum | Yes | `ACTIVE`, `DISABLED` |
| `sessionVersion` | number | Yes | Incremented to invalidate existing JWT sessions after password reset |
| `createdAt` | Date | Yes | Audit |
| `updatedAt` | Date | Yes | Audit |

## Indexes

```text
UNIQUE: { email: 1 }
UNIQUE (sparse): { authProvider: 1, googleSubject: 1 }
```

`phone` is not a login key in V1.

## `auth_tokens` Collection

Global, short-lived credentials for account verification and password resets.
Store only a SHA-256 hash of each random token. Each user has at most one
current token per purpose; tokens expire and are single-use.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `userId` | ObjectId | Yes | References `users` |
| `purpose` | enum | Yes | `EMAIL_VERIFICATION`, `PASSWORD_RESET` |
| `tokenHash` | string | Yes | Unique hash; raw token is only sent to the user |
| `expiresAt` | Date | Yes | TTL expiration |
| `createdAt` | Date | Yes | Token issue time |

Indexes: unique `{ userId: 1, purpose: 1 }`, unique `{ tokenHash: 1 }`, and TTL
`{ expiresAt: 1 }` with `expireAfterSeconds: 0`.

---

# 8. `weddings` Collection — Tenant Root

Every wedding is a tenant.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Tenant ID |
| `slug` | string | Yes | Public, unique wedding slug |
| `status` | enum | Yes | `PLANNING`, `ACTIVE`, `COMPLETED` |
| `bride` | object | Yes | Name and optional photo reference |
| `groom` | object | Yes | Name and optional photo reference |
| `title` | string | Yes | Display title |
| `description` | string/null | No | Wedding description/story intro |
| `weddingDate` | Date | Yes | Primary date |
| `city` | string | Yes | Wedding city |
| `timezone` | string | Yes | IANA timezone, e.g. `Asia/Kolkata` |
| `language` | enum | Yes | `en`, `hi` |
| `hashtag` | string/null | No | Optional wedding hashtag |
| `themeKey` | string | No | UI theme identifier |
| `coverImageKey` | string/null | No | S3 object key |
| `storage` | object | Yes | Quota and derived usage |
| `summary` | object | No | Rebuildable dashboard counters |
| `settings` | object | Yes | Public page and reminder settings |
| `createdAt` | Date | Yes | Audit |
| `updatedAt` | Date | Yes | Audit |

### Recommended embedded structures

```json
{
  "storage": {
    "quotaBytes": 5368709120,
    "usedBytes": 0
  },
  "summary": {
    "guestCount": 0,
    "rsvpYesCount": 0,
    "rsvpNoCount": 0,
    "rsvpPendingCount": 0,
    "taskOpenCount": 0,
    "taskCompletedCount": 0,
    "expensePaidAmount": 0,
    "expenseCommittedAmount": 0
  },
  "settings": {
    "publicWeddingPageEnabled": true,
    "publicGalleryEnabled": true,
    "publicLivestreamEnabled": true,
    "defaultReminderEnabled": true
  }
}
```

The `summary` object is derived data. Collection records remain the source of truth.

## Indexes

```text
UNIQUE: { slug: 1 }
{ status: 1, weddingDate: 1 }
```

---

# 9. `wedding_members` Collection

Maps a user account to the wedding tenant and stores membership/role assignments.

## Why this is separate from `users`

It allows authentication identity and wedding authorization to remain separate. It also leaves a clean path for a future planner account to belong to multiple weddings if the product later changes that rule.

## V1 rule

A user can have at most one ACTIVE or SUSPENDED wedding membership at a time.
REMOVED membership history is retained, and that user may later join or
create a different wedding.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Membership ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `userId` | ObjectId | Yes | User ID |
| `roleIds` | ObjectId[] | Yes | One or more role definitions |
| `membershipStatus` | enum | Yes | `ACTIVE`, `SUSPENDED`, `REMOVED` |
| `invitedByMemberId` | ObjectId/null | No | Audit |
| `joinedAt` | Date/null | No | Activation time |
| `createdAt` | Date | Yes | Audit |
| `updatedAt` | Date | Yes | Audit |

## Critical indexes

```text
UNIQUE (partial; membershipStatus in ACTIVE, SUSPENDED): { userId: 1 }
UNIQUE: { tenantId: 1, userId: 1 }
{ tenantId: 1, membershipStatus: 1 }
{ tenantId: 1, roleIds: 1 }
```

The partial unique index enforces one current wedding membership per user
while allowing retained REMOVED membership records and a later membership
in a different wedding.

## 9.1 `member_invitations` Collection

Implemented policy: seven-day validity, normalized invited email, multiple existing roles,
SHA-256 token hashes, no TTL deletion, and a fresh token on replacement. Only creation
or replacement returns the raw link; listings never reconstruct it. Membership and
invitation transitions append activity in the same transaction. An internal
`wedding_members.accessVersion` counter serializes actor authorization against concurrent
membership/role changes without changing the actor's displayed `updatedAt`. Manager
updates use the target's current `updatedAt` for optimistic concurrency. Same-wedding
rejoining reactivates the retained removed row so historical references remain valid.

Stores invitations separately so an invite can be sent before the recipient
has an application account. It is tenant-scoped and does not reserve the
recipient's one-wedding membership until the invitation is accepted.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Invitation ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `normalizedEmail` | string | Yes | Lowercased invitee email |
| `roleIds` | ObjectId[] | Yes | Roles offered to the invitee |
| `tokenHash` | string | Yes | Hash of high-entropy acceptance token |
| `status` | enum | Yes | `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED` |
| `invitedByMemberId` | ObjectId | Yes | Inviting member |
| `acceptedByUserId` | ObjectId/null | No | Set after acceptance |
| `expiresAt` | Date | Yes | Invitation validity deadline |
| `acceptedAt` | Date/null | No | Acceptance time |
| `createdAt` | Date | Yes | Audit |
| `updatedAt` | Date | Yes | Audit |

Recommended indexes:

```text
UNIQUE: { tokenHash: 1 }
UNIQUE (partial; status = PENDING): { tenantId: 1, normalizedEmail: 1 }
{ tenantId: 1, status: 1, expiresAt: 1 }
```

Expired/revoked invitation records remain available for audit; do not add a
TTL index. Acceptance must check the active-membership unique constraint
before creating a `wedding_members` record.

---

# 10. `roles` Collection

Stores fixed and custom role definitions inside a wedding tenant.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Role ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `key` | string | Yes | Machine-readable key |
| `name` | string | Yes | Display name |
| `description` | string/null | No | Role explanation |
| `permissionKeys` | string[] | Yes | Capability identifiers |
| `isSystemRole` | boolean | Yes | System or custom role |
| `createdByMemberId` | ObjectId/null | No | Audit |
| `createdAt` | Date | Yes | Audit |
| `updatedAt` | Date | Yes | Audit |

## Indexes

```text
UNIQUE: { tenantId: 1, key: 1 }
```

The global permission catalog can remain application configuration rather than another MongoDB collection in V1.

---

# 11. `events` Collection

Stores every wedding ceremony or activity block.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Event ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `name` | string | Yes | Example: Haldi |
| `ceremonyType` | string | No | Optional label, including custom ceremonies; maximum 80 characters |
| `description` | string/null | No | Event information |
| `startAt` | Date | Yes | Event start in UTC storage |
| `endAt` | Date/null | No | Optional end |
| `venue` | object | Yes | Embedded address/location details |
| `dressCode` | string/null | No | Optional |
| `timelineItems` | object[] | No | Small, bounded list of activities |
| `notes` | string/null | No | Additional instructions |
| `status` | enum | Yes | `DRAFT`, `PUBLISHED`, `COMPLETED`, `CANCELLED` |
| `createdByMemberId` | ObjectId | Yes | Creator |
| `createdAt` | Date | Yes | Audit |
| `updatedAt` | Date | Yes | Audit |

### Venue

The venue remains embedded because it is tightly coupled to the event and does not require independent lifecycle management.

Events store UTC `startAt` and optional `endAt`. The API converts separate local
start/end dates and times using the wedding's server-resolved timezone, including
overnight events. Nonexistent or ambiguous daylight-saving times are rejected.
Timeline entries contain an ObjectId, `title`, UTC `at`, and optional `note`;
the embedded list is limited to 100 entries. Preparation entries may precede
the event's start. Mutations require the current `updatedAt` to prevent stale writes.
Event deletion is blocked when tenant-scoped tasks, expenses, vendors, albums,
livestreams, issues, or reminders reference it. Future modules must coordinate
reference creation with event deletion so concurrent operations cannot create dangling references.

```json
{
  "name": "Wedding Venue",
  "addressLine1": "...",
  "city": "Hyderabad",
  "state": "Telangana",
  "postalCode": "...",
  "mapUrl": "...",
  "directions": "..."
}
```

## Indexes

```text
{ tenantId: 1, startAt: 1 }
{ tenantId: 1, status: 1, startAt: 1 }
```

There is no event-level guest mapping collection in V1.

---

# 12. `tasks` Collection

The first implementation bounds assignments at 30 distinct active wedding members and checklists at 50 steps. Each checklist entry has a stable UUID `id`, `title`, and `done`. Integer `revision` increments on task changes and is required for updates/deletion; internal `commentVersion` coordinates comment creation against concurrent task deletion. Comments remain separate. Task mutations write append-only `activity_logs` in the same transaction.

Task event-link writes increment an internal `events.referenceVersion` in the same transaction, without changing event `updatedAt`. This coordinates with event deletion to prevent dangling task references without invalidating unrelated event edits.

Wedding planning and execution tasks.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Task ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `eventId` | ObjectId/null | No | Optional event association |
| `title` | string | Yes | Task title |
| `description` | string/null | No | Detail |
| `assigneeMemberIds` | ObjectId[] | No | One or more responsible members |
| `createdByMemberId` | ObjectId | Yes | Creator |
| `dueAt` | Date/null | No | Deadline |
| `priority` | enum | Yes | `LOW`, `MEDIUM`, `HIGH` |
| `status` | enum | Yes | `TODO`, `IN_PROGRESS`, `WAITING`, `COMPLETED` |
| `checklist` | object[] | No | Small bounded list |
| `completedAt` | Date/null | No | Completion time |
| `createdAt` | Date | Yes | Audit |
| `updatedAt` | Date | Yes | Audit |

## Indexes

```text
{ tenantId: 1, status: 1, dueAt: 1 }
{ tenantId: 1, assigneeMemberIds: 1, status: 1, dueAt: 1 }
{ tenantId: 1, eventId: 1, status: 1 }
```

---

# 13. `task_comments` Collection

Separate comments prevent the task document from growing without bound.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `taskId` | ObjectId | Yes |
| `authorMemberId` | ObjectId | Yes |
| `body` | string | Yes |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
{ tenantId: 1, taskId: 1, createdAt: 1 }
```

---

# 14. `guest_families` Collection

Groups guests into family/household units to help prevent missed people.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `name` | string | Yes |
| `normalizedName` | string | Yes |
| `side` | enum | No | `BRIDE`, `GROOM`, `BOTH`, `OTHER` |
| `primaryContactGuestId` | ObjectId/null | No |
| `notes` | string/null | No |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
{ tenantId: 1, normalizedName: 1 }
```

Do not make the family name unique; two families may legitimately have the same displayed surname/name.

First-slice implementation adds integer `revision` (default 0). Primary contacts
must be active guests in the same family. Moving/archiving a primary contact
clears it and increments the family revision transactionally. Delete a family
only after all active/archived guests have been reassigned or ungrouped.

---

# 15. `guests` Collection

The guest is modeled as an individual person, even when several guests belong to the same family or RSVP together.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Guest ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `familyId` | ObjectId/null | No | Family grouping |
| `name` | string | Yes | Display name |
| `normalizedName` | string | Yes | Search/dedup helper |
| `phone` | string/null | No | Normalized phone |
| `email` | string/null | No | Normalized email |
| `relationship` | string/null | No | Example: Cousin |
| `side` | enum | No | `BRIDE`, `GROOM`, `BOTH`, `OTHER` |
| `guestType` | enum | Yes | `PRIMARY`, `COMPANION`, `CHILD`, `OTHER` |
| `addedByGuestId` | ObjectId/null | No | Set when a guest adds a companion |
| `source` | enum | Yes | `ADMIN`, `MEMBER`, `GUEST_RSVP`, `IMPORT` |
| `notes` | string/null | No | Admin notes |
| `status` | enum | Yes | `ACTIVE`, `ARCHIVED` |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Duplicate strategy

Duplicate prevention is primarily application-level because real families can share:

- The same phone number.
- The same surname.
- Similar or identical names.

The server should build normalized values and perform a tenant-scoped duplicate check using combinations such as:

```text
phone
email
name + family
name + phone suffix
```

The system should warn before creating a probable duplicate rather than enforcing a unique phone-number constraint.

Approved first slice: guest deletion means archive, with explicit restore and
retained family/reference history. Guest documents add integer `revision` (default
0), required for edit/archive/restore. Creation/edit duplicate warnings include
archived records and exact normalized names/shared contact; explicit keep-both
review is permitted. Fuzzy matching and merge are deferred. Mutations take a
transactional `guestWriteVersion` increment on the owning wedding document to
serialize guest/family writes and prevent concurrent reference/duplicate races.

## Indexes

```text
{ tenantId: 1, familyId: 1, normalizedName: 1 }
{ tenantId: 1, normalizedName: 1 }
{ tenantId: 1, phone: 1 }
{ tenantId: 1, email: 1 }
{ tenantId: 1, status: 1 }
```

These are non-unique indexes.

---

# 16. `rsvps` Collection

One RSVP record belongs to one guest. This supports individual tracking even when guests are grouped into families.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | RSVP ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `guestId` | ObjectId | Yes | Individual guest |
| `response` | enum | Yes | `YES`, `NO`, `PENDING` |
| `partySize` | number | No | Intended for the current RSVP interaction; usually `1` when records are individual |
| `submittedVia` | enum | Yes | `INVITATION_LINK`, `ADMIN` |
| `submittedAt` | Date/null | No | RSVP time |
| `updatedAt` | Date | Yes | Last change |

## Recommended V1 behavior

The guest-facing RSVP should be simple. If a guest says they are bringing additional people, each person should ultimately have a separate guest record so the family can identify and manage individuals later.

The companion-creation flow can be implemented as a single transaction:

```text
RSVP submitted
   |
   +-- update primary guest RSVP
   +-- create companion guest documents
   +-- create companion RSVP documents
```

## Indexes

```text
UNIQUE: { tenantId: 1, guestId: 1 }
{ tenantId: 1, response: 1 }
```

---

# 17. `invitations` Collection

Stores the wedding's public invitation configuration/content.

V1 intentionally has one primary invitation configuration per wedding rather than a multi-template invitation builder.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `title` | string | Yes |
| `welcomeMessage` | string/null | No |
| `story` | string/null | No |
| `themeKey` | string | Yes |
| `language` | enum | Yes |
| `coverImageKey` | string/null | No |
| `published` | boolean | Yes |
| `publishedAt` | Date/null | No |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
UNIQUE: { tenantId: 1 }
```

---

# 18. `invitation_links` Collection

Stores guest-specific invitation URLs without requiring guest accounts.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Link ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `invitationId` | ObjectId | Yes | Invitation config |
| `guestId` | ObjectId | Yes | Recipient guest |
| `tokenHash` | string | Yes | Hash of opaque access token |
| `status` | enum | Yes | `ACTIVE`, `REVOKED` |
| `lastAccessedAt` | Date/null | No |
| `lastRsvpAt` | Date/null | No |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
UNIQUE: { tokenHash: 1 }
UNIQUE: { tenantId: 1, guestId: 1 }
{ tenantId: 1, status: 1 }
```

Invitation links do not expire automatically. An admin can revoke and regenerate a link later.

---

# 19. `vendors` Collection

Lightweight vendor management.

**Implemented first slice (22 October 2026):** the approved category contract uses
the PRD supplier category enum, nested contact strings, service (500) and notes
(2000), at most 100 distinct eventIds and ACTIVE/ARCHIVED status. COMPLETED is
deferred. `revision` protects update/archive/restore; `referenceVersion` is touched
transactionally when expenses link a vendor. Creation uses private requestId and
requestHash fields, with a unique partial `{tenantId,requestId}` index for retries.
Indexes also cover `{tenantId,category,status}`, `{tenantId,eventIds}` and
`{tenantId,status,name}`. Archive retains every expense reference; restore does not
alter payments. Stored totalAmount/paidAmount/balanceAmount/paymentDueAt fields in
the original table below are deferred: monetary summaries come from active linked
expenses using exact Decimal128 aggregation and decimal-string responses. No
duplicate vendor financial ledger, document objects or vendor identity is created.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `name` | string | Yes |
| `category` | enum/string | Yes |
| `contact` | object | No |
| `eventIds` | ObjectId[] | No | Events served by vendor |
| `totalAmount` | number | No |
| `paidAmount` | number | No |
| `balanceAmount` | number | No |
| `paymentDueAt` | Date/null | No |
| `notes` | string/null | No |
| `status` | enum | Yes | `ACTIVE`, `COMPLETED`, `ARCHIVED` |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

### Contact

```json
{
  "personName": "...",
  "phone": "...",
  "email": "..."
}
```

## Indexes

```text
{ tenantId: 1, category: 1, status: 1 }
{ tenantId: 1, eventIds: 1 }
{ tenantId: 1, paymentDueAt: 1, status: 1 }
```

---

# 20. `vendor_documents` Collection

Stores metadata for vendor contracts and documents. The actual binary file is stored in S3.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `vendorId` | ObjectId | Yes |
| `fileName` | string | Yes |
| `mimeType` | string | Yes |
| `sizeBytes` | number | Yes |
| `s3Key` | string | Yes |
| `etag` | string/null | No |
| `uploadedByMemberId` | ObjectId | Yes |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
{ tenantId: 1, vendorId: 1, createdAt: -1 }
UNIQUE: { tenantId: 1, s3Key: 1 }
```

---

# 21. `expenses` Collection

## First-slice implementation additions — 21 October 2026

Category is a bounded string (1–80 characters), not a fixed enum. Built-in names
use their canonical keys; custom labels preserve case after whitespace/Unicode
normalization. Store the label on the expense only; no category catalog or new
collection is created.

Approved INR-only slice adds status ACTIVE/ARCHIVED and integer revision. Create
requestId/requestHash are private fields; unique tenantId+requestId uses a partial
string index. One embedded payment contains exact Decimal128 amount, paidAt,
method, notes, payerLabel snapshot, recordedByMemberId, recordedAt and private
requestId/requestHash. Unique tenantId+payment.requestId is partial on strings.
Payment and PAID state are written in the same transaction; they cannot be edited
independently. A COMMITTED expense must be settled in full. No partial payments,
refunds/corrections or separate payment collection in this first slice.

Paid entries cannot be archived/edited. Unpaid archive/restore retains references
and history and changes active summary inclusion. Amounts use Decimal128 and
exact bigint paise arithmetic; API values are bounded INR decimal strings. Event
references are locked transactionally alongside mutation to preserve event
deletion guards. Write transactions revalidate both read and mutation permissions
and append activity. No persisted budget field or manually editable summary totals
are introduced. Existing expense field definitions below remain the base model.

Tracks the wedding's financial records.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `eventId` | ObjectId/null | No |
| `vendorId` | ObjectId/null | No |
| `title` | string | Yes |
| `category` | enum/string | Yes |
| `amount` | Decimal128 | Yes | Avoid floating-point money errors |
| `currency` | string | Yes | Default `INR` |
| `financialState` | enum | Yes | `ESTIMATED`, `COMMITTED`, `PAID` |
| `paidByMemberId` | ObjectId/null | No |
| `paidByName` | string/null | No | Used when payer is not a member |
| `dueAt` | Date/null | No |
| `notes` | string/null | No |
| `createdByMemberId` | ObjectId | Yes |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Money rule

All monetary values must use `Decimal128` in MongoDB and be converted to display currency safely in application code.

## Indexes

```text
{ tenantId: 1, financialState: 1, dueAt: 1 }
{ tenantId: 1, category: 1, createdAt: -1 }
{ tenantId: 1, eventId: 1, createdAt: -1 }
{ tenantId: 1, vendorId: 1, createdAt: -1 }
```

---

# 22. `notifications` Collection

In-app notifications for wedding members.

Implemented assignment slice (22 October 2026): type TASK_ASSIGNED, resourceType
TASK, recipientMemberId and generic title/body (no historical task title or private
details). A private eventKey combines task ID, saved task revision and assignment
event; unique `{tenantId,recipientMemberId,eventKey}` prevents retry duplicates.
Notification writes share the task transaction. Indexes include tenant, recipient,
isRead, createdAt descending and _id descending, plus tenant/recipient/createdAt/_id
for the All cursor listing. Task access is rechecked before title/link enrichment;
unavailable resources retain a generic mark-readable entry. No TTL or automatic
post-wedding deletion, guest account, provider token or notification email is added.

Guests are not given notification accounts in V1.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `recipientMemberId` | ObjectId | Yes |
| `type` | enum/string | Yes |
| `title` | string | Yes |
| `body` | string | Yes |
| `resourceType` | string/null | No |
| `resourceId` | ObjectId/null | No |
| `isRead` | boolean | Yes |
| `readAt` | Date/null | No |
| `createdAt` | Date | Yes |

## Indexes

```text
{ tenantId: 1, recipientMemberId: 1, isRead: 1, createdAt: -1 }
{ tenantId: 1, createdAt: -1 }
```

---

# 23. `reminders` Collection

Scheduled reminders for tasks, events, and payments.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `type` | enum | Yes | `EVENT`, `TASK`, `PAYMENT`, `RSVP` |
| `resourceType` | string | Yes | Source record type |
| `resourceId` | ObjectId | Yes | Source record |
| `recipientMemberIds` | ObjectId[] | Yes | Members to notify |
| `scheduledAt` | Date | Yes | Execution time |
| `status` | enum | Yes | `PENDING`, `PROCESSING`, `SENT`, `FAILED`, `CANCELLED` |
| `attemptCount` | number | Yes |
| `lastAttemptAt` | Date/null | No |
| `sentAt` | Date/null | No |
| `errorMessage` | string/null | No |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Idempotency

A unique reminder key should prevent accidental duplicate reminders when the same reminder is scheduled twice. The exact key can be generated from tenant, resource, reminder type, and scheduled time.

## Indexes

```text
{ status: 1, scheduledAt: 1 }
{ tenantId: 1, status: 1, scheduledAt: 1 }
```

The job processor should atomically claim a pending reminder before processing it.

---

# 24. `gallery_albums` Collection

One event-oriented gallery album per wedding event.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `eventId` | ObjectId | Yes |
| `name` | string | Yes |
| `description` | string/null | No |
| `status` | enum | Yes | `ACTIVE`, `ARCHIVED` |
| `photoCount` | number | Yes | Derived counter |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
UNIQUE: { tenantId: 1, eventId: 1 }
```

---

# 25. `photos` Collection

Photo metadata for the S3-backed wedding gallery.

## Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `_id` | ObjectId | Yes | Photo ID |
| `tenantId` | ObjectId | Yes | Wedding ID |
| `albumId` | ObjectId | Yes | Gallery album |
| `uploadedByMemberId` | ObjectId | Yes | Admin or photographer |
| `original` | object | Yes | S3 metadata |
| `optimized` | object | Yes | Web-sized image |
| `thumbnail` | object | Yes | Small preview |
| `width` | number | Yes |
| `height` | number | Yes |
| `processingStatus` | enum | Yes | `UPLOADING`, `PROCESSING`, `READY`, `FAILED` |
| `checksum` | string/null | No | Duplicate/media integrity helper |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

### S3 object metadata example

```json
{
  "s3Key": "tenant/<weddingId>/events/<eventId>/photos/<photoId>/original.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 4283921
}
```

## Indexes

```text
{ tenantId: 1, albumId: 1, createdAt: -1 }
{ tenantId: 1, processingStatus: 1, createdAt: 1 }
{ tenantId: 1, checksum: 1 }
UNIQUE: { tenantId: 1, "original.s3Key": 1 }
```

---

# 26. Photo Storage and Database Consistency

MongoDB and S3 are separate systems, so the upload flow must be stateful.

```text
1. Create photo document as UPLOADING
2. Reserve / validate tenant storage quota
3. Upload original to S3
4. Create optimized image + thumbnail
5. Update photo document to READY
6. Increment gallery photo counter and wedding storage usage
```

If processing fails:

```text
processingStatus = FAILED
```

A retry job can continue from the recorded S3 objects rather than duplicating records.

Storage quota is 5 GB per wedding in the current product design.

---

# 27. `livestreams` Collection

Stores external livestream configuration. The video itself is not stored in MongoDB.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `eventId` | ObjectId | Yes |
| `provider` | enum/string | Yes |
| `streamUrl` | string | Yes |
| `embedUrl` | string | No |
| `title` | string | Yes |
| `isPublic` | boolean | Yes |
| `status` | enum | Yes | `SCHEDULED`, `LIVE`, `ENDED`, `DISABLED` |
| `createdByMemberId` | ObjectId | Yes |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
UNIQUE: { tenantId: 1, eventId: 1 }
```

V1 assumes one primary livestream configuration per event.

---

# 28. `issues` Collection

Wedding problem/issue tracking.

Implemented first slice (22 October 2026): title max180, description max4000,
revision (default 0), private requestId/requestHash for retry-safe creation and
unique tenantId/requestId index. An additional tenantId/reportedByMemberId/createdAt
index supports own-report reads. Reporter is server-derived and immutable; status
transitions update resolvedAt and revision while appending activity. No deletion.
Comment documents have private requestId/requestHash and a unique index on tenantId,
issueId, authorMemberId, requestId. Comments are plain text, max2000, newest-first
paginated and not editable/deletable in this slice. Both collections are initialized
before mutation transactions; ownership/access, references and audit appends share
the transaction. UI history reuses tenant/resource-scoped activity_logs.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `title` | string | Yes |
| `description` | string | Yes |
| `eventId` | ObjectId/null | No |
| `vendorId` | ObjectId/null | No |
| `reportedByMemberId` | ObjectId | Yes |
| `assignedToMemberId` | ObjectId/null | No |
| `priority` | enum | Yes | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `status` | enum | Yes | `OPEN`, `IN_PROGRESS`, `RESOLVED` |
| `resolvedAt` | Date/null | No |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
{ tenantId: 1, status: 1, priority: 1, createdAt: -1 }
{ tenantId: 1, eventId: 1, status: 1 }
{ tenantId: 1, assignedToMemberId: 1, status: 1 }
```

---

# 29. `issue_comments` Collection

Separate comments for issue discussions.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `issueId` | ObjectId | Yes |
| `authorMemberId` | ObjectId | Yes |
| `body` | string | Yes |
| `createdAt` | Date | Yes |
| `updatedAt` | Date | Yes |

## Indexes

```text
{ tenantId: 1, issueId: 1, createdAt: 1 }
```

---

# 30. `activity_logs` Collection

Immutable history of important wedding changes.

## Why it is separate

Multiple family members can change the same wedding. Activity history gives the team a reliable answer to “who changed this?” without bloating domain documents.

## Fields

| Field | Type | Required |
|---|---|---:|
| `_id` | ObjectId | Yes |
| `tenantId` | ObjectId | Yes |
| `actorMemberId` | ObjectId | Yes |
| `action` | enum/string | Yes |
| `resourceType` | string | Yes |
| `resourceId` | ObjectId | Yes |
| `summary` | string | Yes |
| `metadata` | object | No | Small structured details |
| `createdAt` | Date | Yes |

## Indexes

```text
{ tenantId: 1, createdAt: -1 }
{ tenantId: 1, resourceType: 1, resourceId: 1, createdAt: -1 }
{ tenantId: 1, actorMemberId: 1, createdAt: -1 }
```

Do not store large request payloads in `metadata`.

---

# 31. Relationship Rules

## Wedding and members

```text
weddings 1 ---- N wedding_members N ---- 1 users
```

The current product rule is one user → one wedding at a time, enforced by
a partial unique index on active `wedding_members.userId` values. A user
with only REMOVED membership records may join another wedding.

## Wedding and events

```text
weddings 1 ---- N events
```

## Wedding and guests

```text
weddings 1 ---- N guest_families
weddings 1 ---- N guests
guest_families 1 ---- N guests
```

## Guest and RSVP

```text
guests 1 ---- 1 rsvps
```

A unique index ensures only one current RSVP record per guest.

## Event and gallery

```text
events 1 ---- 1 gallery_albums
albums 1 ---- N photos
```

## Event and livestream

```text
events 1 ---- 0..1 livestreams
```

## Event and tasks/expenses/vendors

These relationships are optional and represented by references, not deep embedding.

---

# 32. Tenant Isolation Rules

Tenant isolation is the most important database security rule.

## Rule 1 — Every tenant collection requires `tenantId`

No tenant collection should permit a document without a valid tenant ID.

## Rule 2 — Repository methods require tenant context

Example conceptual API:

```ts
findGuests(tenantId, filters)
findTask(tenantId, taskId)
createExpense(tenantId, input)
```

Avoid generic repository methods that allow arbitrary queries without tenant context.

## Rule 3 — Parent tenant must match child tenant

If an expense references an event, vendor, or member, all referenced documents must belong to the same tenant.

Example:

```text
Expense.tenantId == Event.tenantId
Expense.tenantId == Vendor.tenantId
Expense.tenantId == PaidByMember.tenantId
```

## Rule 4 — Public guest token resolves the tenant safely

The token lookup identifies the `invitation_links` document. The application then uses its stored `tenantId` rather than trusting tenant information supplied in a URL/query parameter.

## Rule 5 — No cross-tenant joins in application logic

A request for Wedding A must never load a related record belonging to Wedding B even if the client sends Wedding B's object ID.

---

# 33. Query Patterns

The data model is optimized around the main product queries.

## Dashboard

Typical reads:

```text
Wedding summary
Upcoming events
Open/overdue tasks
Guest/RSVP counts
Expense summary
Upcoming payments
Recent issues
Recent activity
```

Most queries are tenant-scoped and supported by compound indexes starting with `tenantId`.

## Guest list

```text
{ tenantId, status, familyId, normalizedName }
```

Support:

- Name search.
- Family filter.
- Side filter.
- RSVP status filter.

## Upcoming events

```text
{ tenantId, startAt }
```

Sort ascending by event time.

## Pending tasks

```text
{ tenantId, status, dueAt }
```

## Pending payments

```text
{ tenantId, financialState, dueAt }
```

## Public wedding page

Read:

```text
weddings
invitations
published events
livestream config
published gallery albums
photos
```

No authenticated tenant membership is required for the public page when the wedding has enabled public visibility.

---

# 34. Dashboard Counters and Aggregations

The authoritative values live in their respective collections.

For example:

```text
RSVP counts → rsvps collection
Guest count → guests collection
Task counts → tasks collection
Expense totals → expenses collection
```

For a fast dashboard, the wedding may maintain derived counters in `weddings.summary`.

These counters should be:

- Updated during writes where safe.
- Rebuildable using aggregation queries.
- Treated as cache/denormalized state.

A maintenance endpoint/job can rebuild them if drift is detected.

---

# 35. MongoDB Transactions

Do not use transactions for every write. Use them only when multiple documents must change together to preserve an important invariant.

Recommended transaction cases:

### Wedding creation

```text
Create wedding
Create owner membership
Create system roles
Create invitation config
```

### RSVP with companion creation

```text
Update primary RSVP
Create companion guests
Create companion RSVP records
```

### Financial updates with derived counters

Where the application updates a payment record and a derived wedding counter together.

### Gallery metadata updates

Use transactions for MongoDB-side counters/metadata when multiple database records must change together. S3 operations remain outside the transaction boundary.

---

# 36. Concurrency and Idempotency

## Unique constraints

Use MongoDB unique indexes for invariants such as:

```text
One email per user
One current wedding membership per user in V1; removed users may join another wedding
One RSVP per guest
One invitation link per guest
One invitation configuration per wedding
One gallery album per event
One livestream configuration per event
```

## Idempotent writes

Operations that may be retried should use stable identifiers or unique keys.

Examples:

- Invitation link creation.
- Reminder scheduling.
- RSVP submission.
- Photo processing.
- Payment reminder creation.

## Optimistic concurrency

For heavily edited records, the service layer can use `updatedAt` or a version field to reject stale updates where appropriate.

---

# 37. Date and Time Storage

All timestamps stored in MongoDB should be UTC dates.

Wedding-level timezone is stored on the `weddings` document.

Example:

```text
weddings.timezone = Asia/Kolkata
```

The application converts user-entered local event times into UTC for storage and converts them back into the wedding timezone for display.

This avoids problems when reminder scheduling or future infrastructure runs outside India.

---

# 38. Money Storage

All money should use `Decimal128`.

Example:

```json
{
  "amount": { "$numberDecimal": "125000.00" },
  "currency": "INR"
}
```

Never use JavaScript floating-point numbers as the persistence representation of money.

---

# 39. S3 Object Key Design

Use tenant/event/resource-aware object paths.

Recommended structure:

```text
weddings/<tenantId>/
  cover/<file>
  events/<eventId>/
    photos/<photoId>/
      original/<file>
      optimized/<file>
      thumbnail/<file>
  vendors/<vendorId>/
    documents/<documentId>/<file>
```

This provides clean isolation, easy debugging, and straightforward lifecycle management.

MongoDB stores only metadata and object keys.

---

# 40. Photo Storage Accounting

Each wedding starts with:

```text
5 GB quota
```

The application should maintain:

```text
weddings.storage.quotaBytes
weddings.storage.usedBytes
```

The quota check must occur before accepting a new upload.

The upload pipeline should use an idempotent storage reservation or update strategy so retries cannot accidentally inflate `usedBytes`.

A periodic reconciliation process can compare MongoDB photo metadata with S3 inventory/known objects if the product later needs stronger accounting guarantees.

---

# 41. Search Strategy

V1 does not require Elasticsearch/OpenSearch.

MongoDB indexes can handle the initial search needs:

- Guest name.
- Guest phone.
- Guest email.
- Event name.
- Task title.
- Vendor name.

Normalized searchable fields should be stored where practical.

For example:

```text
normalizedName = lowercase(trim(name))
```

A future Atlas Search implementation can be introduced if fuzzy/full-text search becomes a real product requirement.

---

# 42. Validation Strategy

Database correctness should be enforced at three layers.

## Layer 1 — API validation

Use Zod to validate incoming requests.

## Layer 2 — Mongoose schemas

Use Mongoose to enforce types, required fields, enums, and basic schema validation.

## Layer 3 — MongoDB indexes

Use unique/compound indexes for invariants and query performance.

Business authorization remains in the application service layer.

---

# 43. Archival and Manual Deletion

There is no automatic post-wedding data deletion.

For operational records where the product eventually needs removal from the UI, prefer an `ARCHIVED` state over immediate hard deletion when practical.

Examples:

```text
Guest → ARCHIVED
Vendor → ARCHIVED
Task → COMPLETED
Issue → RESOLVED
```

Hard deletion of records with financial, invitation, membership, or activity-log significance should be treated as an explicit future product/security policy rather than a default CRUD behavior.

---

# 44. Backup and Recovery Implications

MongoDB Atlas is the database system of record and should use managed backups appropriate to the production environment.

The application should also protect against accidental data loss by:

- Keeping audit history.
- Avoiding destructive cascade deletes.
- Avoiding TTL indexes.
- Keeping S3 objects separate from database metadata.
- Testing restoration procedures before production launch.

Database restore and S3 object restoration should be treated as separate recovery processes.

---

# 45. Environment Separation

Development, staging/UAT, and production must not share application data.

Recommended structure:

```text
Development
  MongoDB database: mmw_dev
  S3 prefix/bucket: dev

Staging / UAT
  MongoDB database: mmw_uat
  S3 prefix/bucket: uat

Production
  MongoDB database: mmw_prod
  S3 prefix/bucket: prod
```

Whether environments use separate Atlas clusters or separate databases on a shared cluster can be decided by cost and operational needs, but production should be isolated from development data.

---

# 46. Data Access Layer Structure

The monolith should access MongoDB through domain-oriented repositories/services rather than scattering Mongoose queries throughout React components or route handlers.

Example:

```text
modules/
  guests/
    guest.model.ts
    guest.repository.ts
    guest.service.ts
    guest.validation.ts

  events/
    event.model.ts
    event.repository.ts
    event.service.ts

  expenses/
    expense.model.ts
    expense.repository.ts
    expense.service.ts
```

A repository method should require tenant context.

Example conceptual contract:

```ts
interface GuestRepository {
  findById(tenantId: ObjectId, guestId: ObjectId): Promise<Guest | null>;
  list(tenantId: ObjectId, query: GuestQuery): Promise<Guest[]>;
  create(tenantId: ObjectId, input: CreateGuestInput): Promise<Guest>;
}
```

This makes cross-tenant access harder to introduce accidentally.

---

# 47. Database Access Anti-Patterns to Avoid

Do not write:

```ts
GuestModel.findById(guestId)
```

for tenant-owned data when the tenant context is known.

Prefer:

```ts
GuestModel.findOne({
  _id: guestId,
  tenantId
})
```

Similarly, do not fetch a wedding-owned child document by `_id` alone.

Avoid embedding thousands of guests, tasks, or photos inside `weddings`.

Avoid storing binary photos/documents in MongoDB.

Avoid relying on client-side role checks as the security boundary.

---

# 48. Important Referential Checks

MongoDB does not provide relational foreign-key enforcement, so the application must verify references.

Examples:

### Task

If `task.eventId` is present:

```text
event.tenantId == task.tenantId
```

### Expense

If `expense.vendorId` is present:

```text
vendor.tenantId == expense.tenantId
```

### Photo

```text
album.tenantId == photo.tenantId
```

### Invitation link

```text
guest.tenantId == invitationLink.tenantId
invitation.tenantId == invitationLink.tenantId
```

### Membership

```text
user._id == membership.userId
wedding._id == membership.tenantId
```

---

# 49. Public Data vs Private Data

The data model must distinguish between publicly renderable wedding data and private management data.

## Public

Potentially visible on the public wedding page:

- Couple names.
- Wedding story.
- Published events.
- Event venues.
- Public livestream.
- Public gallery.
- RSVP entry point.

## Private

Restricted to authorized wedding members:

- Expenses.
- Financial payment records.
- Internal task assignments.
- Internal issues.
- Membership/permission management.
- Private operational notes.
- Vendor documents.
- Activity logs.

The database does not make all fields public merely because the parent wedding page is public. Public data must be intentionally selected by the application layer.

---

# 50. Sample Core Documents

## Sample wedding

```json
{
  "_id": "ObjectId(...)" ,
  "slug": "anish-priya",
  "status": "PLANNING",
  "title": "Anish & Priya",
  "bride": {
    "name": "Priya"
  },
  "groom": {
    "name": "Anish"
  },
  "weddingDate": "2026-10-20T12:30:00.000Z",
  "city": "Hyderabad",
  "timezone": "Asia/Kolkata",
  "language": "en",
  "storage": {
    "quotaBytes": 5368709120,
    "usedBytes": 0
  },
  "summary": {
    "guestCount": 742,
    "rsvpYesCount": 624,
    "rsvpNoCount": 58,
    "rsvpPendingCount": 60
  },
  "settings": {
    "publicWeddingPageEnabled": true,
    "publicGalleryEnabled": true,
    "publicLivestreamEnabled": true,
    "defaultReminderEnabled": true
  },
  "createdAt": "2026-10-07T00:00:00.000Z",
  "updatedAt": "2026-10-07T00:00:00.000Z"
}
```

## Sample guest

```json
{
  "tenantId": "ObjectId(wedding)",
  "familyId": "ObjectId(family)",
  "name": "Rahul Sharma",
  "normalizedName": "rahul sharma",
  "phone": "+919876543210",
  "relationship": "Cousin",
  "side": "GROOM",
  "guestType": "PRIMARY",
  "source": "MEMBER",
  "status": "ACTIVE",
  "createdAt": "2026-10-07T00:00:00.000Z",
  "updatedAt": "2026-10-07T00:00:00.000Z"
}
```

## Sample RSVP

```json
{
  "tenantId": "ObjectId(wedding)",
  "guestId": "ObjectId(guest)",
  "response": "YES",
  "submittedVia": "INVITATION_LINK",
  "submittedAt": "2026-10-07T05:00:00.000Z",
  "updatedAt": "2026-10-07T05:00:00.000Z"
}
```

---

# 51. Guest RSVP Data Flow

```text
Guest opens invitation link
        |
        v
Invitation token
        |
        v
Find invitation_links by tokenHash
        |
        v
Resolve tenantId + guestId
        |
        v
Load public wedding/invitation data
        |
        v
Guest submits RSVP
        |
        v
Validate token + guest ownership
        |
        +---- update RSVP -------------------+
        |                                     |
        +---- optionally create companions ---+
        |
        v
Update derived summary counters
        |
        v
Create activity/notification where appropriate
```

A guest never receives access to another tenant because the token resolves to one specific invitation link and the server uses the stored tenant relationship.

---

# 52. Photo Upload Data Flow

```text
Admin / Photographer
        |
        v
Request upload authorization
        |
        v
Check tenant + role + 5 GB quota
        |
        v
Create photo = UPLOADING
        |
        v
Upload original to S3
        |
        v
Image processing
  |             |
  v             v
Optimized     Thumbnail
  |             |
  +-------> MongoDB photo = READY
                  |
                  v
          Gallery photo counter
                  |
                  v
          Wedding storage usage
```

---

# 53. Dashboard Read Model Strategy

The dashboard should remain simple in V1.

Use normal indexed collections and a small number of aggregation queries.

The dashboard should not require a dedicated analytics database or event-streaming system.

Potentially useful derived wedding counters:

```text
summary.guestCount
summary.rsvpYesCount
summary.rsvpNoCount
summary.rsvpPendingCount
summary.taskOpenCount
summary.taskCompletedCount
summary.expensePaidAmount
summary.expenseCommittedAmount
```

These can be rebuilt from the source collections if necessary.

---

# 54. Scalability for 500–2,000 Guests

The expected guest scale is small enough for a standard MongoDB Atlas deployment.

The key scaling decisions are:

- Guests are separate documents.
- Guest queries always include `tenantId`.
- Search fields are normalized and indexed.
- Photos are outside MongoDB.
- Activity history is a separate collection.
- Public gallery responses are cacheable at the CDN layer.
- No unbounded array is embedded in the wedding document.

No MongoDB sharding is required for V1.

If the platform later grows to a very large number of active weddings, Atlas cluster scaling and eventually sharding can be evaluated using actual workload evidence.

---

# 55. Recommended Compound Index Summary

| Collection | Index |
|---|---|
| `users` | `UNIQUE { email: 1 }` |
| `users` | `UNIQUE sparse { authProvider: 1, googleSubject: 1 }` |
| `weddings` | `UNIQUE { slug: 1 }` |
| `weddings` | `{ status: 1, weddingDate: 1 }` |
| `wedding_members` | Partial `UNIQUE { userId: 1 }` for `ACTIVE`, `SUSPENDED` |
| `wedding_members` | `UNIQUE { tenantId: 1, userId: 1 }` |
| `member_invitations` | `UNIQUE { tokenHash: 1 }`; partial tenant + email unique while pending |
| `wedding_members` | `{ tenantId: 1, membershipStatus: 1 }` |
| `roles` | `UNIQUE { tenantId: 1, key: 1 }` |
| `events` | `{ tenantId: 1, startAt: 1 }` |
| `events` | `{ tenantId: 1, status: 1, startAt: 1 }` |
| `tasks` | `{ tenantId: 1, status: 1, dueAt: 1 }` |
| `tasks` | `{ tenantId: 1, assigneeMemberIds: 1, status: 1, dueAt: 1 }` |
| `guest_families` | `{ tenantId: 1, normalizedName: 1 }` |
| `guests` | `{ tenantId: 1, familyId: 1, normalizedName: 1 }` |
| `guests` | `{ tenantId: 1, normalizedName: 1 }` |
| `guests` | `{ tenantId: 1, phone: 1 }` |
| `rsvps` | `UNIQUE { tenantId: 1, guestId: 1 }` |
| `invitations` | `UNIQUE { tenantId: 1 }` |
| `invitation_links` | `UNIQUE { tokenHash: 1 }` |
| `invitation_links` | `UNIQUE { tenantId: 1, guestId: 1 }` |
| `vendors` | `{ tenantId: 1, category: 1, status: 1 }` |
| `expenses` | `{ tenantId: 1, financialState: 1, dueAt: 1 }` |
| `notifications` | `{ tenantId: 1, recipientMemberId: 1, isRead: 1, createdAt: -1 }` |
| `reminders` | `{ tenantId: 1, status: 1, scheduledAt: 1 }` |
| `gallery_albums` | `UNIQUE { tenantId: 1, eventId: 1 }` |
| `photos` | `{ tenantId: 1, albumId: 1, createdAt: -1 }` |
| `livestreams` | `UNIQUE { tenantId: 1, eventId: 1 }` |
| `issues` | `{ tenantId: 1, status: 1, priority: 1, createdAt: -1 }` |
| `activity_logs` | `{ tenantId: 1, createdAt: -1 }` |

Indexes should be verified against real query plans after implementation; this is the starting design rather than a claim that every index is mandatory forever.

---

# 56. Security Checklist for the Database Layer

- Every tenant-owned document has `tenantId`.
- Every repository method accepts tenant context.
- No public API trusts a client-supplied tenant ID.
- Cross-tenant parent/child references are validated.
- Guest invitation tokens are stored hashed.
- Original photos and documents are stored outside MongoDB.
- MongoDB connection credentials live in AWS Secrets Manager.
- No sensitive credentials are stored in documents.
- Expense data is only exposed through authorized application queries.
- Activity logs are append-only from normal application flows.
- No TTL index is configured for wedding data.
- MongoDB backups and S3 protection are enabled for production.

---

# 57. Future Evolution Path

The database design intentionally leaves room for future growth without requiring V1 complexity.

### Future planner SaaS

The current partial unique `wedding_members.userId` index can later be
relaxed if professional planners need simultaneous membership in multiple
weddings.

### Atlas Search

If guest/vendor/task search becomes more advanced, MongoDB Atlas Search can be added without changing the core domain model.

### More notification channels

WhatsApp can be introduced using the existing `reminders` and `notifications` concepts without changing core business entities.

### Advanced image processing

Face-based or AI photo features can be added as separate derived metadata later without changing the basic `photos` model.

### Larger tenant sizes

If future weddings substantially exceed 2,000 guests or the platform reaches very high scale, additional indexes, read replicas, caching, queues, or sharding can be evaluated from actual workload evidence.

---

# 58. Final Database Architecture

```text
                           MAKE MY MARRIAGE
                                  |
                                  v
                         MongoDB Atlas Cluster
                                  |
          +-----------------------+-----------------------+
          |                                               |
       GLOBAL                                          TENANT
          |                                               |
       users                                          weddings
                                                          |
             +--------------------------------------------+------------------------------+
             |              |              |               |             |               |
          members         events         guests           tasks        expenses        vendors
             |              |              |               |             |               |
           roles            |           families         comments       payments      documents
                            |              |
                 +----------+-----+        +-----+
                 |                |              |
              gallery         stream          RSVP
                 |
               photos

           invitations / invitation_links
           notifications / reminders
           issues / issue_comments
           activity_logs

                     Binary files / photos / docs
                              |
                              v
                         Amazon S3
```

# 59. Final Decisions

| Decision | Final choice |
|---|---|
| Database | MongoDB Atlas |
| Tenant model | One wedding = one tenant |
| Tenant storage | Shared collections + mandatory `tenantId` |
| User accounts | One account manages one wedding in V1 |
| Family collaboration | Many members per wedding |
| Guest accounts | None |
| Guest access | Personalized opaque invitation links |
| Guest records | One document per person |
| Event guest mapping | Not required in V1; everyone is invited to every event |
| RSVP | One RSVP document per guest |
| Photo storage | S3 |
| Photo metadata | MongoDB |
| Photo variants | Original + optimized + thumbnail |
| Photo quota | 5 GB per wedding |
| Documents | S3 + MongoDB metadata |
| Money | `Decimal128`, INR by default |
| Time | UTC in DB + wedding IANA timezone |
| Roles | RBAC with custom roles/permissions |
| Search | MongoDB indexes in V1 |
| Reminders | MongoDB reminder state + scheduled processing |
| Notifications | In-app in V1; WhatsApp later |
| Livestream | External provider embedded in wedding page |
| Audit history | `activity_logs` |
| Automatic deletion | None |
| TTL indexes | None |
| Sharding | Not required in V1 |
| Billing data | None; product is free |

---

# 60. Database Design Completion Criteria

The database design is ready for implementation when the development team can answer “yes” to all of the following:

- Can every tenant-owned query be scoped to exactly one wedding?
- Can a user be prevented from joining a second wedding under the V1 account rule?
- Can 500–2,000 guests be queried and filtered efficiently?
- Can the application avoid duplicate guest records without incorrectly blocking legitimate people with shared contact information?
- Can a guest RSVP without creating an account?
- Can a guest add companions while preserving individual guest records?
- Can the gallery store thousands of photos without storing binaries in MongoDB?
- Can the application retry photo processing without creating duplicates?
- Can reminders be claimed idempotently?
- Can the dashboard be populated with indexed queries and rebuildable counters?
- Can important family/member changes be audited?
- Can production data remain available after the wedding without TTL deletion?

If all answers are yes, the MongoDB design is aligned with the approved Make My Marriage product and system architecture.

## Invitation / RSVP implementation additions — 21 October 2026

Invitation content uses one invitations record per tenant with published/revision fields. invitation_links has unique tokenHash and unique tenantId+guestId, lifecycle revision, rsvpRevision, and private lastRequestId/lastRequestHash for retry safety. Only hashes are stored; replacement rotates the hash in the retained link record. No TTL applies to guest links.

rsvps has unique tenantId+guestId and individual YES/NO/PENDING response; partySize is informational and never summed for total guest counts. Public companions are guests with source GUEST_RSVP, addedByGuestId, and private rsvpClientId; a partial unique tenantId+addedByGuestId+rsvpClientId index prevents duplicate retry creation. Existing guest/family references remain tenant scoped.

Activity may use actorGuestId with nullable actorMemberId for genuine no-account RSVP attribution. public_rate_limits stores hashed token/scope/minute keys and a short expiresAt TTL, never raw bearer tokens. Wedding guestWriteVersion serializes guest/family/invitation/RSVP transactions; authenticated writes revalidate member permission inside the transaction.
# Demo batch persistence update — 22 October 2026

Approved Cloudinary Free demo exception: gallery_albums has tenantId/eventId unique,
name/status/revision. Photos have tenant/album/event/uploader IDs, hidden provider
publicId, original/optimized/thumbnail URLs and verified bytes/dimensions. Lifecycle:
UPLOADING → READY or FAILED; explicit removal uses DELETING → DELETED or
DELETE_FAILED. Retain metadata/history; no automatic post-wedding deletion. Capacity
counts all non-DELETED rows (20/wedding). Provider deletion occurs outside MongoDB
transactions; retained states allow explicit retry after interruption.

Wedding settings add revision and nullable publicPagePublishedAt. Public reads must
require a date marker plus publicWeddingPageEnabled; legacy true booleans do not
authorize publication. Profile edits use user.profileRevision and never mutate
email/authProvider/verified status. Livestreams are unique tenantId/eventId, store
validated YouTube videoId/title/status/isPublic/revision/creator, and derive URLs.
All linked references are checked with tenant filters in wedding transactions.
