# Make My Marriage — API Design Document

**Product:** Make My Marriage  
**Document Type:** API Design Document  
**Version:** 1.0  
**Status:** Approved API Baseline  
**Architecture:** Multi-tenant Modular Monolith  
**Application:** Next.js + TypeScript + Node.js  
**Database:** MongoDB Atlas  
**Object Storage:** Amazon S3  

---

## 1. Purpose

This document defines the API contract and application-layer conventions for Make My Marriage.

The API is designed for a single Dockerized Next.js application running as a modular monolith. All business modules live inside the same application, but each module exposes a clear service/API boundary.

The primary API responsibilities are:

- Authentication and user identity
- Wedding workspace management
- Tenant/member management
- Roles and permissions
- Event and timeline management
- Task planning
- Guest and family management
- RSVP management
- Digital invitation management
- Notifications and reminders
- Expense and payment tracking
- Vendor management
- Photo gallery and S3 upload workflows
- Livestream configuration
- Issue reporting
- Activity/audit history
- Dashboard summaries
- Search and basic reports

---

# 2. API Design Principles

## 2.1 REST-oriented API

The application uses REST-style HTTP endpoints under a versioned prefix:

```text
/api/v1
```

Resources use nouns rather than verbs wherever practical.

Example:

```text
GET    /api/v1/events
POST   /api/v1/events
GET    /api/v1/events/:eventId
PATCH  /api/v1/events/:eventId
DELETE /api/v1/events/:eventId
```

## 2.2 Multi-tenant by default

Every protected request operates within the authenticated user's wedding tenant.

The API must derive the tenant from authenticated membership context rather than trusting a client-provided `tenantId` in the request body.

```text
Authenticated User
        ↓
Wedding Membership
        ↓
Tenant Context
        ↓
Module Service
        ↓
MongoDB Query with tenantId
```

A client must never be able to switch tenants simply by changing an ID in JSON or query parameters.

## 2.3 Authorization before data access

The request pipeline should perform authorization before business data is read or modified.

```text
Request
  ↓
Authentication
  ↓
Tenant Resolution
  ↓
Permission Check
  ↓
Input Validation
  ↓
Business Logic
  ↓
Database / Storage
```

## 2.4 Validate all input

All request bodies, query parameters and route parameters must be validated before entering the service layer.

Recommended approach:

- Zod for request/response schemas
- TypeScript types derived from validation schemas where practical

## 2.5 Consistent responses

Successful responses should use a predictable envelope.

Example:

```json
{
  "success": true,
  "data": {
    "id": "event_123",
    "name": "Sangeet"
  }
}
```

Errors should use a consistent structure.

```json
{
  "success": false,
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "Event not found",
    "details": null,
    "requestId": "req_abc123"
  }
}
```

## 2.6 Pagination

Collection endpoints should support cursor or page-based pagination. Cursor pagination is preferred for large datasets such as guests, notifications and activity logs.

Example:

```text
GET /api/v1/guests?limit=50&cursor=eyJpZCI6...
```

Response:

```json
{
  "success": true,
  "data": [
    {}
  ],
  "pagination": {
    "limit": 50,
    "nextCursor": "eyJpZCI6...",
    "hasMore": true
  }
}
```

## 2.7 Idempotency

Operations that may be retried by clients or infrastructure should support idempotency where appropriate.

Especially important for:

- RSVP submission
- Invitation state updates
- Expense creation from external/retry-prone flows
- Notification creation
- Upload completion callbacks

The API may accept:

```http
Idempotency-Key: <unique-client-generated-key>
```

for supported endpoints.

---

# 3. Base URL

The API is exposed under:

```text
https://<application-domain>/api/v1
```

Examples:

```text
https://app.makemymarriage.com/api/v1
https://app.makemymarriage.com/api/v1/events
```

Public wedding/invitation routes may use a separate public prefix, while still being implemented by the same application:

```text
/api/v1/public/...
```

---

# 4. Authentication Model

## 4.1 Admin / Family / Organizer / Vendor Users

Authenticated users have an application account.

Supported login methods:

- Email + password
- Google sign-in

Phone OTP is not part of V1.

## 4.2 Guests

Guests do not create accounts.

They use a personalized invitation link containing a high-entropy access token or opaque invitation identifier.

Example:

```text
https://app.makemymarriage.com/invite/<opaque-token>
```

Guest APIs must expose only the minimal public information required for the guest journey.

## 4.3 Session model

The authentication/session implementation may use Auth.js. Internal authorization must still resolve an application user and wedding membership before accessing tenant-owned resources.

---

# 5. Common HTTP Conventions

## Methods

```text
GET     Read
POST    Create / command-style action where appropriate
PATCH   Partial update
DELETE  Delete
```

## Content Type

JSON APIs use:

```http
Content-Type: application/json
```

Multipart upload is used only for direct file-upload workflows where necessary.

## Date/Time

All timestamps crossing the API boundary should use ISO 8601.

Example:

```text
2026-10-18T18:00:00+05:30
```

Internally, timestamps should be stored consistently in UTC, while the wedding's configured timezone is used for presentation and scheduling.

## IDs

MongoDB ObjectIds or an application-level opaque ID strategy may be used. The API must expose stable opaque identifiers and must not expose internal database details unnecessarily.

---

# 6. Standard Error Codes

Recommended common error codes:

| Code | Meaning |
|---|---|
| `VALIDATION_ERROR` | Request data is invalid |
| `UNAUTHENTICATED` | Login/session required |
| `FORBIDDEN` | User lacks required permission |
| `NOT_FOUND` | Resource does not exist in accessible tenant |
| `CONFLICT` | Operation conflicts with current state |
| `DUPLICATE_RESOURCE` | Resource would violate uniqueness rule |
| `RATE_LIMITED` | Too many requests |
| `IDEMPOTENCY_CONFLICT` | Reused idempotency key with different request |
| `FILE_TOO_LARGE` | File exceeds configured limit |
| `UNSUPPORTED_FILE_TYPE` | File type is not allowed |
| `STORAGE_ERROR` | Object-storage operation failed |
| `INTERNAL_ERROR` | Unexpected server error |
| `SERVICE_UNAVAILABLE` | Temporary dependency outage |

Domain-specific codes should be added where they improve client behavior.

---

# 7. API Module Map

```text
/api/v1
│
├── /auth
├── /wedding
├── /members
├── /roles
├── /events
├── /tasks
├── /guests
├── /families
├── /rsvp
├── /invitations
├── /notifications
├── /reminders
├── /expenses
├── /payments
├── /vendors
├── /gallery
├── /photos
├── /livestream
├── /issues
├── /activity
├── /dashboard
├── /reports
└── /search
```

---

# 8. Authentication APIs

## 8.1 Get current session

```http
GET /api/v1/auth/session
```

### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "Anish",
      "email": "anish@example.com"
    },
    "wedding": {
      "id": "wedding_123",
      "role": "OWNER"
    }
  }
}
```

## 8.2 Complete onboarding / create wedding

```http
POST /api/v1/auth/onboarding
```

### Request

```json
{
  "wedding": {
    "title": "Anish & Priya",
    "brideName": "Priya",
    "groomName": "Anish",
    "weddingDate": "2026-10-20",
    "timezone": "Asia/Kolkata",
    "city": "Hyderabad",
    "language": "en"
  }
}
```

The authenticated user becomes the initial wedding owner.

Onboarding must prevent a second wedding while the account has an active or suspended wedding membership. A user with only removed membership history may join or create another wedding.

## 8.3 Update profile

```http
PATCH /api/v1/auth/profile
```

## 8.4 Logout

```http
POST /api/v1/auth/logout
```

The actual session provider may implement login/logout endpoints differently internally; these logical operations define the application contract.

---

# 9. Wedding APIs

## 9.1 Get wedding

```http
GET /api/v1/wedding
```

## 9.2 Update wedding

```http
PATCH /api/v1/wedding
```

### Example

```json
{
  "title": "Anish & Priya",
  "description": "We are getting married!",
  "city": "Hyderabad",
  "timezone": "Asia/Kolkata",
  "language": "hi",
  "hashtag": "#AnishWedsPriya"
}
```

## 9.3 Upload/update couple photo

```text
POST /api/v1/wedding/image-upload-url
POST /api/v1/wedding/image-complete
```

The preferred flow is presigned S3 upload rather than sending large images through the Next.js application.

---

# 10. Wedding Member APIs

## 10.1 List members

```http
GET /api/v1/members
```

## 10.2 Invite member

```http
POST /api/v1/members/invitations
```

### Request

```json
{
  "email": "family@example.com",
  "roleId": "role_family_member"
}
```

## 10.3 Get member

```http
GET /api/v1/members/:memberId
```

## 10.4 Update member role

```http
PATCH /api/v1/members/:memberId
```

### Request

```json
{
  "roleId": "role_organizer"
}
```

## 10.5 Remove member

```http
DELETE /api/v1/members/:memberId
```

## 10.6 Accept membership invitation

```http
POST /api/v1/members/invitations/:token/accept
```

The token must be high entropy and time-limited where appropriate.

---

# 11. Role & Permission APIs

## 11.1 List roles

```http
GET /api/v1/roles
```

## 11.2 Create custom role

```http
POST /api/v1/roles
```

### Request

```json
{
  "name": "Invitation Manager",
  "permissions": [
    "VIEW_GUESTS",
    "MANAGE_GUESTS",
    "MANAGE_INVITATION",
    "VIEW_RSVP"
  ]
}
```

## 11.3 Update custom role

```http
PATCH /api/v1/roles/:roleId
```

## 11.4 Delete custom role

```http
DELETE /api/v1/roles/:roleId
```

Deletion must be blocked if the role is still assigned, unless a safe reassignment mechanism is implemented.

---

# 12. Event APIs

## 12.1 List events

```http
GET /api/v1/events?sort=date&order=asc
```

## 12.2 Create event

```http
POST /api/v1/events
```

### Request

```json
{
  "name": "Sangeet",
  "description": "Sangeet ceremony",
  "date": "2026-10-19",
  "startTime": "19:00",
  "endTime": "22:00",
  "timezone": "Asia/Kolkata",
  "venue": {
    "name": "Taj Palace",
    "address": "Hyderabad"
  },
  "dressCode": "Traditional"
}
```

## 12.3 Get event

```http
GET /api/v1/events/:eventId
```

## 12.4 Update event

```http
PATCH /api/v1/events/:eventId
```

## 12.5 Delete event

```http
DELETE /api/v1/events/:eventId
```

Deletion should be restricted to users with event-management permissions.

## 12.6 Event timeline/activity items

```http
GET  /api/v1/events/:eventId/timeline
POST /api/v1/events/:eventId/timeline
PATCH /api/v1/events/:eventId/timeline/:itemId
DELETE /api/v1/events/:eventId/timeline/:itemId
```

## 12.7 Event reminders

```http
POST /api/v1/events/:eventId/reminders
GET  /api/v1/events/:eventId/reminders
```

---

# 13. Task APIs

## 13.1 List tasks

```http
GET /api/v1/tasks?status=TODO&assigneeId=user_123&eventId=event_123
```

Supported filters:

- status
- priority
- assignee
- event
- due date
- overdue

## 13.2 Create task

```http
POST /api/v1/tasks
```

### Request

```json
{
  "title": "Book Photographer",
  "description": "Finalize photographer contract",
  "eventId": "event_wedding",
  "assigneeId": "user_123",
  "dueAt": "2026-10-10T18:00:00Z",
  "priority": "HIGH"
}
```

## 13.3 Get task

```http
GET /api/v1/tasks/:taskId
```

## 13.4 Update task

```http
PATCH /api/v1/tasks/:taskId
```

## 13.5 Delete task

```http
DELETE /api/v1/tasks/:taskId
```

## 13.6 Task comments

```http
GET  /api/v1/tasks/:taskId/comments
POST /api/v1/tasks/:taskId/comments
```

## 13.7 Task templates

```http
GET  /api/v1/task-templates
POST /api/v1/task-templates/apply
```

A template application operation should create tenant-owned tasks and must be idempotent when a client retries the same request.

---

# 14. Family APIs

## 14.1 Create family

```http
POST /api/v1/families
```

### Request

```json
{
  "name": "Sharma Family",
  "side": "GROOM",
  "notes": "Close family"
}
```

## 14.2 List families

```http
GET /api/v1/families
```

## 14.3 Update family

```http
PATCH /api/v1/families/:familyId
```

## 14.4 Delete family

```http
DELETE /api/v1/families/:familyId
```

The API should not allow a family deletion to orphan guest records without explicit reassignment/null handling.

---

# 15. Guest APIs

Guests are one of the most important modules and must be optimized for 500–2,000 records per wedding.

## 15.1 List guests

```http
GET /api/v1/guests
```

### Query parameters

```text
search
familyId
side
relationship
rsvpStatus
invitationStatus
page/limit or cursor/limit
sortBy
sortOrder
```

Example:

```text
GET /api/v1/guests?search=Rahul&familyId=family_123&rsvpStatus=PENDING&limit=50
```

## 15.2 Create guest

```http
POST /api/v1/guests
```

### Request

```json
{
  "name": "Rahul Sharma",
  "phone": "+919876543210",
  "email": "rahul@example.com",
  "familyId": "family_123",
  "side": "GROOM",
  "relationship": "Cousin",
  "notes": "Coming with family"
}
```

The service must perform duplicate checks before creation.

## 15.3 Bulk import guests

```http
POST /api/v1/guests/import
```

Preferred V1 flow:

```text
Client uploads CSV/Excel
        ↓
Server validates rows
        ↓
Duplicate detection
        ↓
Import preview
        ↓
Client confirms
        ↓
Create guest records
```

A preview endpoint is recommended:

```http
POST /api/v1/guests/import/preview
POST /api/v1/guests/import/commit
```

## 15.4 Get guest

```http
GET /api/v1/guests/:guestId
```

## 15.5 Update guest

```http
PATCH /api/v1/guests/:guestId
```

## 15.6 Delete guest

```http
DELETE /api/v1/guests/:guestId
```

## 15.7 Add family member through guest relationship

```http
POST /api/v1/guests/:guestId/related-guests
```

### Request

```json
{
  "name": "Neha Sharma",
  "phone": "+919999999999",
  "relationship": "Sister"
}
```

This creates a separate guest record.

## 15.8 Guest statistics

```http
GET /api/v1/guests/stats
```

### Example response

```json
{
  "success": true,
  "data": {
    "total": 1240,
    "invited": 1240,
    "confirmed": 820,
    "declined": 210,
    "pending": 210
  }
}
```

---

# 16. RSVP APIs

RSVP is a guest-facing flow with no guest account.

## 16.1 Get invitation RSVP form

```http
GET /api/v1/public/invitations/:token/rsvp
```

The response must include only information safe for the guest.

## 16.2 Submit RSVP

```http
POST /api/v1/public/invitations/:token/rsvp
```

### Request

```json
{
  "attendance": "YES",
  "attendeeCount": 4
}
```

or:

```json
{
  "attendance": "NO",
  "attendeeCount": 0
}
```

## 16.3 Update RSVP

```http
PATCH /api/v1/public/invitations/:token/rsvp
```

The token must be authorized only for the associated invitation/guest.

## 16.4 Admin RSVP summary

```http
GET /api/v1/rsvp/stats
```

## 16.5 Admin RSVP list

```http
GET /api/v1/rsvp?status=PENDING&limit=50
```

---

# 17. Invitation APIs

## 17.1 Get invitation configuration

```http
GET /api/v1/invitations
```

## 17.2 Create/configure invitation

```http
POST /api/v1/invitations
```

## 17.3 Update invitation

```http
PATCH /api/v1/invitations/:invitationId
```

Possible fields:

- title
- greeting
- story
- theme
- language
- visibility
- event display preferences
- gallery display
- livestream display

## 17.4 Generate guest invitation link

```http
POST /api/v1/invitations/guest-links
```

### Request

```json
{
  "guestId": "guest_123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "guestId": "guest_123",
    "url": "https://app.makemymarriage.com/invite/opaque-token"
  }
}
```

The raw token should not be stored in plaintext in MongoDB. Store a secure hash or equivalent lookup-safe representation.

## 17.5 Get public wedding invitation

```http
GET /api/v1/public/invitations/:token
```

This should return only public/guest-visible content.

## 17.6 Invitation status

```http
GET /api/v1/invitations/status
```

Possible statuses:

```text
DRAFT
GENERATED
SENT_MANUALLY
OPENED
RSVP_COMPLETED
```

Automatic WhatsApp sending is Phase 2, so V1 tracks generated/shared invitation links rather than treating the platform as the WhatsApp sender.

---

# 18. Notification APIs

## 18.1 List notifications

```http
GET /api/v1/notifications?unread=true&limit=50
```

## 18.2 Mark notification read

```http
PATCH /api/v1/notifications/:notificationId/read
```

## 18.3 Mark all read

```http
POST /api/v1/notifications/read-all
```

## 18.4 Notification preferences

```http
GET   /api/v1/notifications/preferences
PATCH /api/v1/notifications/preferences
```

V1 channel:

```text
IN_APP
```

Phase 2:

```text
WHATSAPP
```

V1 reminder notifications are in-app for authenticated wedding members.
Guest invitation/event reminders are deferred to Phase 2 because guests do
not have accounts. Email may be used for authentication and system-critical
communication; WhatsApp is a Phase 2 channel.

---

# 19. Reminder APIs

## 19.1 List reminders

```http
GET /api/v1/reminders
```

## 19.2 Create reminder

```http
POST /api/v1/reminders
```

### Request

```json
{
  "type": "EVENT",
  "eventId": "event_123",
  "remindAt": "2026-10-19T12:00:00Z",
  "message": "Sangeet starts today at 7 PM"
}
```

## 19.3 Update reminder

```http
PATCH /api/v1/reminders/:reminderId
```

## 19.4 Delete reminder

```http
DELETE /api/v1/reminders/:reminderId
```

The reminder service must verify the requester has permission to manage the resource being reminded.

---

# 20. Expense APIs

## 20.1 List expenses

```http
GET /api/v1/expenses?eventId=event_123&status=PENDING&limit=50
```

## 20.2 Create expense

```http
POST /api/v1/expenses
```

### Request

```json
{
  "title": "Wedding Photographer",
  "amount": 80000,
  "category": "PHOTOGRAPHY",
  "eventId": "event_wedding",
  "vendorId": "vendor_123",
  "paidByUserId": "user_123",
  "status": "COMMITTED",
  "dueAt": "2026-10-15T18:00:00Z",
  "notes": "Final payment"
}
```

## 20.3 Get expense

```http
GET /api/v1/expenses/:expenseId
```

## 20.4 Update expense

```http
PATCH /api/v1/expenses/:expenseId
```

## 20.5 Delete expense

```http
DELETE /api/v1/expenses/:expenseId
```

## 20.6 Expense summary

```http
GET /api/v1/expenses/summary
```

### Example response

```json
{
  "success": true,
  "data": {
    "budget": 1000000,
    "estimated": 1000000,
    "committed": 750000,
    "paid": 640000,
    "remaining": 360000,
    "pendingPayments": 110000
  }
}
```

Expense data must be protected by permission checks.

---

# 21. Payment APIs

Payments are kept lightweight and are primarily used for internal tracking and reminders.

## 21.1 List payment obligations

```http
GET /api/v1/payments?status=PENDING
```

## 21.2 Mark payment paid

```http
POST /api/v1/expenses/:expenseId/payments
```

### Request

```json
{
  "amount": 35000,
  "paidAt": "2026-10-14T15:00:00Z",
  "paymentMethod": "BANK_TRANSFER",
  "notes": "Final payment"
}
```

## 21.3 Upcoming payments

```http
GET /api/v1/payments/upcoming?days=7
```

The API should derive pending payment summaries from the expense/payment model rather than maintaining duplicate totals manually wherever possible.

---

# 22. Vendor APIs

## 22.1 List vendors

```http
GET /api/v1/vendors?eventId=event_123&type=PHOTOGRAPHER
```

## 22.2 Create vendor

```http
POST /api/v1/vendors
```

### Request

```json
{
  "name": "ABC Photography",
  "type": "PHOTOGRAPHER",
  "phone": "+919876543210",
  "email": "abc@example.com",
  "eventIds": ["event_wedding"],
  "totalAmount": 80000
}
```

## 22.3 Get vendor

```http
GET /api/v1/vendors/:vendorId
```

## 22.4 Update vendor

```http
PATCH /api/v1/vendors/:vendorId
```

## 22.5 Delete vendor

```http
DELETE /api/v1/vendors/:vendorId
```

## 22.6 Invite vendor

```http
POST /api/v1/vendors/:vendorId/invite
```

The invite should create/reuse a restricted membership/invitation flow.

---

# 23. Vendor Document APIs

## 23.1 Request upload URL

```http
POST /api/v1/vendors/:vendorId/documents/upload-url
```

### Request

```json
{
  "fileName": "photography-contract.pdf",
  "contentType": "application/pdf",
  "size": 524288
}
```

### Response

```json
{
  "success": true,
  "data": {
    "uploadUrl": "<presigned-url>",
    "objectKey": "tenant/wedding_123/vendors/vendor_123/contract.pdf",
    "expiresIn": 900
  }
}
```

## 23.2 Complete upload

```http
POST /api/v1/vendors/:vendorId/documents/complete
```

## 23.3 List vendor documents

```http
GET /api/v1/vendors/:vendorId/documents
```

## 23.4 Delete document

```http
DELETE /api/v1/vendors/:vendorId/documents/:documentId
```

---

# 24. Gallery / Photo APIs

Photo files are stored in S3. MongoDB stores metadata and relationships.

## 24.1 List albums

```http
GET /api/v1/gallery/albums
```

## 24.2 Create album

```http
POST /api/v1/gallery/albums
```

### Request

```json
{
  "eventId": "event_haldi",
  "name": "Haldi"
}
```

## 24.3 Update album

```http
PATCH /api/v1/gallery/albums/:albumId
```

## 24.4 Delete album

```http
DELETE /api/v1/gallery/albums/:albumId
```

## 24.5 Request photo upload URL

```http
POST /api/v1/gallery/photos/upload-url
```

### Request

```json
{
  "albumId": "album_haldi",
  "fileName": "IMG_001.jpg",
  "contentType": "image/jpeg",
  "size": 7340032
}
```

### Response

```json
{
  "success": true,
  "data": {
    "uploadUrl": "<presigned-url>",
    "objectKey": "tenant/wedding_123/photos/original/uuid.jpg",
    "uploadId": "upload_123"
  }
}
```

## 24.6 Complete photo upload

```http
POST /api/v1/gallery/photos/upload-complete
```

### Request

```json
{
  "uploadId": "upload_123",
  "albumId": "album_haldi",
  "objectKey": "tenant/wedding_123/photos/original/uuid.jpg"
}
```

The completion path should enqueue/trigger image processing where appropriate.

## 24.7 List photos

```http
GET /api/v1/gallery/albums/:albumId/photos?limit=50&cursor=...
```

## 24.8 Get photo metadata

```http
GET /api/v1/gallery/photos/:photoId
```

## 24.9 Request download URL

```http
POST /api/v1/gallery/photos/:photoId/download-url
```

The API must verify that the requester can access the photo before returning a signed S3 download URL.

## 24.10 Delete photo

```http
DELETE /api/v1/gallery/photos/:photoId
```

Only permitted uploader/admin roles can perform the operation.

---

# 25. Photo Processing Flow

The application should avoid processing large images synchronously in the browser request path.

```text
Photographer/Admin
        ↓
Request Upload URL
        ↓
Presigned S3 Upload
        ↓
Upload Complete API
        ↓
Image Processing Job
        ↓
 ┌───────────────┬────────────────┬──────────────┐
 │               │                │              │
 ▼               ▼                ▼              ▼
Original      Optimized         Thumbnail      Metadata
S3 object     Web image         Small image     MongoDB
```

The database stores references to the resulting objects.

---

# 26. Livestream APIs

The platform uses an external streaming provider in V1.

## 26.1 Create livestream

```http
POST /api/v1/livestreams
```

### Request

```json
{
  "eventId": "event_wedding",
  "title": "Wedding Ceremony",
  "provider": "YOUTUBE",
  "streamUrl": "https://www.youtube.com/watch?v=...",
  "isPublic": true
}
```

## 26.2 List livestreams

```http
GET /api/v1/livestreams
```

## 26.3 Update livestream

```http
PATCH /api/v1/livestreams/:livestreamId
```

## 26.4 Delete livestream

```http
DELETE /api/v1/livestreams/:livestreamId
```

## 26.5 Public livestream lookup

```http
GET /api/v1/public/events/:eventId/livestream
```

Only public livestream fields should be returned.

---

# 27. Issue Reporting APIs

## 27.1 Create issue

```http
POST /api/v1/issues
```

### Request

```json
{
  "title": "Decorator has not arrived",
  "description": "Stage setup is incomplete",
  "eventId": "event_sangeet",
  "vendorId": "vendor_decorator",
  "priority": "HIGH"
}
```

## 27.2 List issues

```http
GET /api/v1/issues?status=OPEN&priority=HIGH
```

## 27.3 Get issue

```http
GET /api/v1/issues/:issueId
```

## 27.4 Update issue

```http
PATCH /api/v1/issues/:issueId
```

## 27.5 Add issue comment

```http
POST /api/v1/issues/:issueId/comments
```

## 27.6 Delete issue

```http
DELETE /api/v1/issues/:issueId
```

Deletion should generally be limited to authorized management roles; resolving an issue is preferred over deletion for auditability.

---

# 28. Activity / Audit APIs

Important operations should generate activity log records automatically from the service layer.

## 28.1 List activity

```http
GET /api/v1/activity?limit=50&cursor=...
```

## 28.2 Activity by resource

```http
GET /api/v1/activity?resourceType=EVENT&resourceId=event_123
```

Activity entries may include:

```json
{
  "action": "UPDATED",
  "resourceType": "EVENT",
  "resourceId": "event_123",
  "actorId": "user_123",
  "changes": {
    "startTime": {
      "from": "18:00",
      "to": "19:00"
    }
  },
  "createdAt": "2026-10-07T10:32:00Z"
}
```

Audit logs should be append-oriented and should not be casually editable through normal CRUD APIs.

---

# 29. Dashboard APIs

The dashboard should use aggregation endpoints rather than requiring the client to make many small API calls for every card.

## 29.1 Main wedding dashboard

```http
GET /api/v1/dashboard
```

### Example response

```json
{
  "success": true,
  "data": {
    "countdown": {
      "weddingDate": "2026-10-20",
      "daysRemaining": 13
    },
    "nextEvent": {
      "id": "event_haldi",
      "name": "Haldi",
      "startAt": "2026-10-18T18:00:00+05:30"
    },
    "tasks": {
      "total": 52,
      "completed": 37,
      "overdue": 4
    },
    "guests": {
      "total": 742,
      "confirmed": 624,
      "pending": 118
    },
    "expenses": {
      "paid": 640000,
      "committed": 750000,
      "remaining": 360000,
      "pendingPayments": 110000
    },
    "openIssues": 2
  }
}
```

## 29.2 Organizer dashboard

```http
GET /api/v1/dashboard/organizer
```

The response emphasizes:

- Upcoming events
- Task workload
- Vendor status
- Open issues
- Payments due
- RSVP status

---

# 30. Reports APIs

## 30.1 Guest report

```http
GET /api/v1/reports/guests
```

## 30.2 Expense report

```http
GET /api/v1/reports/expenses
```

## 30.3 Task report

```http
GET /api/v1/reports/tasks
```

## 30.4 Wedding overview report

```http
GET /api/v1/reports/overview
```

Reports should return summarized data and should not duplicate transactional records.

---

# 31. Search APIs

## 31.1 Global search

```http
GET /api/v1/search?q=Rahul&type=all
```

Supported types:

```text
guests
events
tasks
vendors
expenses
members
all
```

### Example response

```json
{
  "success": true,
  "data": {
    "guests": [],
    "events": [],
    "tasks": [],
    "vendors": [],
    "expenses": [],
    "members": []
  }
}
```

For V1, MongoDB-backed text/indexed search is sufficient. OpenSearch is intentionally not required.

---

# 32. Public API Surface

Public endpoints require special isolation because they are not authenticated using a normal user session.

The public API should include only:

```text
GET  /api/v1/public/invitations/:token
GET  /api/v1/public/invitations/:token/rsvp
POST /api/v1/public/invitations/:token/rsvp
PATCH /api/v1/public/invitations/:token/rsvp
GET  /api/v1/public/events/:eventId/livestream
GET  /api/v1/public/gallery/albums/:albumId
GET  /api/v1/public/gallery/photos/:photoId/download-url
```

Public APIs must be designed so that possessing one guest token cannot expose another guest's data.

---

# 33. Tenant Context Enforcement

Tenant context is established centrally.

Pseudo-flow:

```text
request
  ↓
read authenticated session
  ↓
identify userId
  ↓
load active wedding membership
  ↓
construct TenantContext {
    tenantId,
    userId,
    roleIds,
    permissions
  }
  ↓
pass TenantContext to service
```

Service queries must always scope tenant-owned documents.

Example:

```ts
await GuestModel.findOne({
  _id: guestId,
  tenantId: ctx.tenantId
});
```

Never:

```ts
await GuestModel.findOne({ _id: guestId });
```

unless the query is operating on a truly global resource.

---

# 34. Authorization Pattern

Recommended pattern:

```ts
requireAuth();
requirePermission("MANAGE_GUESTS");
validateInput();
service.createGuest(ctx, input);
```

The service layer should still enforce ownership and business rules even if the route already performs authorization. This provides defense in depth.

---

# 35. Critical Business Rules

## 35.1 One account, one wedding

An account may have at most one active or suspended wedding membership at a time. A user with only removed membership history may join or create another wedding.

## 35.2 One wedding, many members

Multiple authenticated users may belong to the same wedding tenant.

## 35.3 Guests have no accounts

Guest access is token based.

## 35.4 All events are visible to guests

V1 does not support event-level guest assignment or event-level invitation exclusions.

## 35.5 Guest records are individual

Additional family attendees should become separate guest records.

## 35.6 Duplicate prevention

Guest creation and import must run duplicate detection.

## 35.7 Expense privacy

Only authorized members can read or modify expenses.

## 35.8 Photo upload restrictions

Only admin/photographer roles can upload photos.

## 35.9 Photo access

Gallery photos are not private within the wedding experience in V1.

## 35.10 Public livestream

Livestreams are public.

## 35.11 No automatic post-wedding deletion

Wedding data remains available after the wedding. No deletion workflow is currently required.

---

# 36. File Upload Security

File uploads must never accept arbitrary paths from the client.

The server should generate controlled object keys such as:

```text
<tenantId>/photos/<albumId>/<uuid>-original.jpg
<tenantId>/photos/<albumId>/<uuid>-optimized.webp
<tenantId>/photos/<albumId>/<uuid>-thumbnail.webp
<tenantId>/vendors/<vendorId>/<uuid>-document.pdf
```

The API should validate:

- MIME type
- File extension
- File size
- Tenant ownership
- Target resource ownership

S3 bucket access should not be publicly writable.

---

# 37. Rate Limiting

Rate limits are especially important for public guest endpoints.

Recommended starting limits:

```text
Login/auth: strict
Public invitation fetch: moderate
Public RSVP submit: strict
Guest-link lookup: moderate
Image upload URL creation: moderate
Normal authenticated CRUD: generous
```

Exact numeric limits should be tuned after observing real usage.

---

# 38. Idempotency Examples

## RSVP

If the guest submits the RSVP twice due to network retry, the result should not create duplicate RSVP records.

## Expense

A retry with the same idempotency key should return the original created expense rather than create another expense.

## Upload completion

Repeated upload completion calls should not create duplicate photo metadata records.

---

# 39. Concurrency Considerations

Concurrent family members may edit the same data.

Examples:

```text
Family Member A → edits event time
Family Member B → edits event venue
```

The update model should prefer partial `PATCH` operations so unrelated fields do not overwrite each other.

For highly sensitive state changes, use optimistic concurrency/version checks where needed.

Example:

```json
{
  "version": 7,
  "startTime": "19:00"
}
```

The API can reject updates based on stale version values with:

```text
409 CONFLICT
```

This should be applied selectively rather than to every resource.

---

# 40. API Layer Structure Inside the Modular Monolith

Recommended project structure:

```text
src/
├── app/
│   └── api/
│       └── v1/
│           ├── auth/
│           ├── wedding/
│           ├── members/
│           ├── events/
│           ├── tasks/
│           ├── guests/
│           ├── rsvp/
│           ├── invitations/
│           ├── expenses/
│           ├── vendors/
│           ├── notifications/
│           ├── gallery/
│           ├── livestream/
│           ├── issues/
│           ├── activity/
│           ├── dashboard/
│           └── reports/
│
├── modules/
│   ├── auth/
│   ├── wedding/
│   ├── members/
│   ├── events/
│   ├── tasks/
│   ├── guests/
│   ├── rsvp/
│   ├── invitations/
│   ├── expenses/
│   ├── vendors/
│   ├── notifications/
│   ├── gallery/
│   ├── livestream/
│   ├── issues/
│   └── activity/
│
└── lib/
    ├── auth/
    ├── db/
    ├── permissions/
    ├── storage/
    ├── validation/
    ├── rate-limit/
    └── errors/
```

Routes should remain thin.

```text
Route Handler
    ↓
Validation
    ↓
Authorization
    ↓
Module Service
    ↓
Repository/Data Access
    ↓
MongoDB / S3 / Job system
```

---

# 41. API Response Envelope

Recommended standard response:

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

List response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "limit": 50,
      "nextCursor": "...",
      "hasMore": true
    }
  }
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to manage guests.",
    "details": null,
    "requestId": "req_123"
  }
}
```

The API should avoid returning stack traces or internal database/provider errors to clients.

---

# 42. HTTP Status Code Guidelines

| Status | Use |
|---|---|
| `200` | Successful read/update/action |
| `201` | Successful creation |
| `202` | Accepted async operation |
| `204` | Successful delete with no response body |
| `400` | Malformed/invalid request |
| `401` | Authentication required/invalid |
| `403` | Permission denied |
| `404` | Resource unavailable |
| `409` | State/uniqueness/version conflict |
| `413` | Payload/file too large |
| `415` | Unsupported content/file type |
| `422` | Semantically invalid business input, if used separately from 400 |
| `429` | Rate limit |
| `500` | Unexpected server error |
| `503` | Dependency temporarily unavailable |

---

# 43. API Security Rules

1. Never trust `tenantId` supplied by the client for authorization.
2. Never authorize solely from client-side role state.
3. Every tenant-owned MongoDB query must include tenant scoping.
4. Public invitation tokens must be high entropy and non-guessable.
5. Store token hashes rather than raw long-lived secrets where practical.
6. Use short-lived signed S3 URLs.
7. Never expose S3 bucket credentials to the browser.
8. Validate file sizes and MIME types.
9. Sanitize free-form text where it is rendered into HTML or rich content.
10. Apply rate limits to public endpoints.
11. Do not expose sensitive expense information through public wedding APIs.
12. Do not expose private member information to guests.
13. Record sensitive administrative changes in the activity log.
14. Rotate secrets through AWS Secrets Manager or the selected secret-management mechanism.

---

# 44. API Observability

Every API request should carry a request ID.

Example:

```http
X-Request-Id: req_01J...
```

The server should log at least:

- Request ID
- Timestamp
- HTTP method
- Route
- Tenant ID where applicable
- User ID where applicable
- Response status
- Duration
- Error code when applicable

Sensitive data such as passwords, invitation tokens, signed S3 URLs, and personal financial details must not be logged in plaintext.

---

# 45. Background / Async API Operations

Some operations should return quickly and continue asynchronously.

Candidates:

- Image processing
- Large guest import
- Notification fan-out
- Scheduled reminder execution
- Report generation if a future report becomes expensive

Example:

```text
POST /api/v1/guests/import/commit
        ↓
202 Accepted
        ↓
Import Job
        ↓
MongoDB updates
        ↓
Notification
```

The exact AWS scheduling/job implementation is defined by the system architecture, but the API should be designed for asynchronous execution where appropriate.

---

# 46. Guest Journey API Flow

```text
Guest receives personalized link
        ↓
GET /api/v1/public/invitations/:token
        ↓
View wedding
        ↓
GET RSVP details
        ↓
POST /api/v1/public/invitations/:token/rsvp
        ↓
RSVP stored
        ↓
Guest sees confirmation
        ↓
Later:
Livestream + Gallery APIs
```

No guest registration is required.

---

# 47. Family Planning Journey API Flow

```text
Login
 ↓
GET /api/v1/auth/session
 ↓
GET /api/v1/wedding
 ↓
GET /api/v1/dashboard
 ↓
GET /api/v1/events
 ↓
GET /api/v1/tasks
 ↓
GET /api/v1/guests
 ↓
GET /api/v1/expenses
 ↓
GET /api/v1/vendors
```

The UI should use the dashboard aggregation endpoint to reduce unnecessary network round trips for the initial dashboard render.

---

# 48. Recommended API Build Order

The API should be implemented in dependency order.

## Phase 1 — Foundation

1. Auth
2. Tenant/wedding context
3. Members
4. Roles/permissions
5. Common errors/validation
6. Activity logging

## Phase 2 — Core Wedding Management

7. Wedding
8. Events
9. Timeline
10. Tasks
11. Guests
12. Families

## Phase 3 — Guest Experience

13. Invitations
14. Public wedding pages
15. RSVP
16. Notifications
17. Reminders

## Phase 4 — Operations

18. Expenses
19. Payments
20. Vendors
21. Issues
22. Organizer dashboard
23. Reports

## Phase 5 — Memories & Live Experience

24. Gallery
25. Photo uploads
26. S3 processing
27. Livestream

## Phase 6 — Optimization

28. Search improvements
29. Bulk import optimizations
30. Rate limiting tuning
31. API performance improvements

---

# 49. API Testing Strategy

Every module should have:

### Unit tests

- Validation
- Business rules
- Permission checks
- Service logic

### Integration tests

- MongoDB persistence
- Tenant isolation
- Unique constraints/index behavior
- Transactions where applicable
- S3 upload workflow

### API tests

- HTTP status codes
- Request/response schemas
- Authentication
- Authorization
- Error behavior

### Security tests

Particular focus on:

```text
Tenant A → cannot access Tenant B
Guest A → cannot access Guest B
Family Member → cannot access protected expense data
Vendor → cannot access unrelated wedding data
```

### Load tests

At minimum, validate workloads around:

- 2,000 guests per wedding
- Large guest list filtering/search
- Bulk guest import
- High invitation-page traffic
- Public gallery browsing

---

# 50. Example End-to-End Tenant Isolation Test

Given:

```text
Wedding A = tenant_A
Wedding B = tenant_B
```

Guest A belongs to:

```text
guest_A → tenant_A
```

Authenticated Wedding A user requests:

```text
GET /api/v1/guests/guest_B
```

Expected result:

```http
404 Not Found
```

or an equivalent safe denial that does not reveal the existence of the other tenant's resource.

The application must not return:

```json
{
  "guestId": "guest_B",
  "tenantId": "tenant_B"
}
```

---

# 51. API Versioning Strategy

Initial version:

```text
/api/v1
```

Breaking changes should result in a future version:

```text
/api/v2
```

Non-breaking additions should generally be added to V1 without creating unnecessary versions.

---

# 52. OpenAPI / API Documentation

The API contract should be represented in OpenAPI once implementation starts.

Recommended output:

```text
/openapi.yaml
```

This can be used to:

- Generate client types
- Generate interactive API documentation
- Validate request/response contracts
- Support future mobile applications
- Support future integrations

The OpenAPI specification should be generated or maintained from the actual validation schemas where possible to reduce contract drift.

---

# 53. Key Architecture Decisions Reflected in the API

| Decision | API consequence |
|---|---|
| Modular monolith | All modules live in one deployable application |
| Next.js + Node.js | Route handlers/server services run in same application |
| MongoDB Atlas | REST resources map cleanly to MongoDB domain models |
| Multi-tenant | Every tenant-owned API request is tenant scoped |
| One account → one current wedding | No simultaneous multi-wedding membership/switching APIs in V1 |
| Many members per wedding | Membership and role APIs required |
| Guest accounts not required | Guest APIs use invitation tokens |
| 500–2,000 guests | Pagination, indexed search and bulk import are required |
| Event-based model | Event ID is used as a reference across tasks/vendors/expenses/gallery |
| S3 media | Presigned upload/download URLs |
| 5 GB photo baseline | Upload/storage limits enforced by application plan/configuration |
| Public livestream | Separate public livestream lookup endpoints |
| In-app notifications | Notification APIs live inside the monolith |
| WhatsApp Phase 2 | Notification abstraction should allow a future WhatsApp channel |
| No automatic deletion | No post-wedding cleanup API is required in V1 |
| Free product | No billing/subscription/payment APIs for SaaS plans |

---

# 54. Explicitly Excluded APIs in V1

The following API groups are intentionally not required:

```text
/billing
/subscriptions
/accommodations
/transportation
/seating
/check-in
/face-search
/marketplace
/planner-multi-wedding
```

They can be introduced later without changing the core API philosophy.

---

# 55. Final API Surface Summary

```text
AUTH
  GET    /auth/session
  POST   /auth/onboarding
  PATCH  /auth/profile
  POST   /auth/logout

WEDDING
  GET    /wedding
  PATCH  /wedding

MEMBERS
  GET    /members
  POST   /members/invitations
  GET    /members/:id
  PATCH  /members/:id
  DELETE /members/:id
  POST   /members/invitations/:token/accept

ROLES
  GET    /roles
  POST   /roles
  PATCH  /roles/:id
  DELETE /roles/:id

EVENTS
  GET    /events
  POST   /events
  GET    /events/:id
  PATCH  /events/:id
  DELETE /events/:id
  GET    /events/:id/timeline
  POST   /events/:id/timeline

TASKS
  GET    /tasks
  POST   /tasks
  GET    /tasks/:id
  PATCH  /tasks/:id
  DELETE /tasks/:id
  GET    /tasks/:id/comments
  POST   /tasks/:id/comments

FAMILIES
  GET    /families
  POST   /families
  PATCH  /families/:id
  DELETE /families/:id

GUESTS
  GET    /guests
  POST   /guests
  POST   /guests/import/preview
  POST   /guests/import/commit
  GET    /guests/:id
  PATCH  /guests/:id
  DELETE /guests/:id
  POST   /guests/:id/related-guests
  GET    /guests/stats

RSVP
  GET    /public/invitations/:token/rsvp
  POST   /public/invitations/:token/rsvp
  PATCH  /public/invitations/:token/rsvp
  GET    /rsvp
  GET    /rsvp/stats

INVITATIONS
  GET    /invitations
  POST   /invitations
  PATCH  /invitations/:id
  POST   /invitations/guest-links
  GET    /public/invitations/:token

NOTIFICATIONS
  GET    /notifications
  PATCH  /notifications/:id/read
  POST   /notifications/read-all
  GET    /notifications/preferences
  PATCH  /notifications/preferences

REMINDERS
  GET    /reminders
  POST   /reminders
  PATCH  /reminders/:id
  DELETE /reminders/:id

EXPENSES
  GET    /expenses
  POST   /expenses
  GET    /expenses/:id
  PATCH  /expenses/:id
  DELETE /expenses/:id
  GET    /expenses/summary

PAYMENTS
  GET    /payments
  POST   /expenses/:expenseId/payments
  GET    /payments/upcoming

VENDORS
  GET    /vendors
  POST   /vendors
  GET    /vendors/:id
  PATCH  /vendors/:id
  DELETE /vendors/:id
  POST   /vendors/:id/invite

GALLERY
  GET    /gallery/albums
  POST   /gallery/albums
  PATCH  /gallery/albums/:id
  DELETE /gallery/albums/:id
  POST   /gallery/photos/upload-url
  POST   /gallery/photos/upload-complete
  GET    /gallery/albums/:id/photos
  GET    /gallery/photos/:id
  POST   /gallery/photos/:id/download-url
  DELETE /gallery/photos/:id

LIVESTREAM
  GET    /livestreams
  POST   /livestreams
  PATCH  /livestreams/:id
  DELETE /livestreams/:id
  GET    /public/events/:eventId/livestream

ISSUES
  GET    /issues
  POST   /issues
  GET    /issues/:id
  PATCH  /issues/:id
  DELETE /issues/:id
  POST   /issues/:id/comments

ACTIVITY
  GET    /activity

DASHBOARD
  GET    /dashboard
  GET    /dashboard/organizer

REPORTS
  GET    /reports/guests
  GET    /reports/expenses
  GET    /reports/tasks
  GET    /reports/overview

SEARCH
  GET    /search
```

---

# 56. Final Recommendation

The API should remain intentionally simple and domain-oriented.

The application should not expose database-shaped endpoints directly. Business rules should live in module services, while route handlers provide the HTTP boundary.

The most important implementation rule is:

> **Every request is authorized against the current wedding tenant before tenant-owned data is accessed.**

The API should be easy for the current web application to consume and structured well enough that a future mobile app, organizer portal, or other client can use the same contracts.

---

# 57. Document Status

This API design is based on the approved:

- Product Requirements Document
- System Architecture decisions
- MongoDB Database Design

It is the baseline for implementation. Any future API change should be reviewed against tenant isolation, permission boundaries, guest simplicity, and the modular-monolith architecture before implementation.
