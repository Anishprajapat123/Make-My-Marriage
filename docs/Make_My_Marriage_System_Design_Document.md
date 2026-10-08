**MAKE MY MARRIAGE**

**System Design Document**

Multi-Tenant Modular Monolith for Indian Wedding Planning

**Version 1.0 \| 06 October 2026**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Architecture baseline</strong></p>
<p>Next.js + Node.js modular monolith, TypeScript, MongoDB Atlas with
shared collections and strict tenant isolation, Amazon S3 for media, AWS
deployment with one Dockerized application. The product is free; there
is no billing or subscription module in V1.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

*Prepared from the approved product and architecture decisions*

# Document Contents

- 1\. Executive Summary

- 2\. Architecture Goals and Constraints

- 3\. Approved Technology Stack

- 4\. High-Level Architecture

- 5\. Multi-Tenancy Architecture

- 6\. Application / Module Architecture

- 7\. Authentication and Authorization

- 8\. MongoDB Data Architecture

- 9\. Media and File Storage Architecture

- 10\. API and Application Communication

- 11\. Core Data Flows

- 12\. Notifications and Background Processing

- 13\. Wedding Invitation and Guest Access

- 14\. Livestream Architecture

- 15\. Deployment Architecture

- 16\. Security Architecture

- 17\. Reliability, Backup and Disaster Recovery

- 18\. Observability and Operations

- 19\. Performance and Scalability

- 20\. Environment Strategy

- 21\. Development and Repository Structure

- 22\. Testing Strategy

- 23\. Architecture Decisions and Trade-offs

- 24\. Future Evolution Path

- 25\. Risks and Mitigations

- 26\. Final Architecture Summary

# 1. Executive Summary

Make My Marriage is a free, multi-tenant wedding planning and management
SaaS for Indian weddings. Each wedding is its own tenant/workspace.
Bride, groom, family members, organizers, finance members,
photographers, and vendors collaborate within that tenant. Guests do not
create accounts; they interact through public wedding pages and
personalized invitation links.

The architecture is intentionally a modular monolith. A single
Dockerized Next.js application runs the user interface and server-side
business logic on Node.js. MongoDB Atlas is the system of record, using
shared collections with a mandatory tenantId on tenant-owned documents.
Amazon S3 stores photographs and vendor documents. AWS provides the
application runtime and surrounding managed infrastructure.

<img src="Make_My_Marriage_System_Design_Document_assets/image1.png"
style="width:6.4in;height:1.54788in" />

*Figure 1. Logical architecture: one application with modular business
domains and managed data/storage services.*

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Key design principle</strong></p>
<p>Keep the wedding-planning domain inside one deployable application,
but enforce strong module boundaries and tenant-aware data access.
Complexity is added only when a real product need appears.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Architecture Goals and Constraints

## 2.1 Goals

- Support one wedding per user account while allowing many users to
  collaborate in a wedding.

- Support approximately 500–2,000 guests per wedding without redesigning
  the data model.

- Keep guest interactions frictionless: no guest accounts and simple
  RSVP.

- Prevent cross-wedding data access with defense-in-depth tenant
  isolation.

- Store large media outside MongoDB and deliver it efficiently to
  guests.

- Provide a clean foundation for a future professional wedding-planner
  SaaS without introducing multi-service complexity now.

- Run reliably in AWS with Docker and managed services.

## 2.2 Constraints / non-goals

- No microservices, Kubernetes, Kafka, RabbitMQ, Redis, or
  Elasticsearch/OpenSearch in V1.

- No phone/OTP authentication.

- No guest account creation.

- No automatic post-wedding deletion.

- No accommodation, transportation, seating, face-recognition, or
  guest-check-in modules in V1.

- No proprietary livestream infrastructure in V1.

- No billing, subscription, or freemium enforcement; the product is free
  for the current release.

# 3. Approved Technology Stack

| **Layer**          | **Technology / Decision**          | **Reason**                                                                                          |
|--------------------|------------------------------------|-----------------------------------------------------------------------------------------------------|
| Architecture       | Modular monolith                   | Simplest reliable architecture for V1; clear module boundaries without distributed-system overhead. |
| Web application    | Next.js App Router                 | Single application can serve public wedding pages and authenticated management UI.                  |
| Language           | TypeScript                         | Safer contracts across many domain entities and permission-heavy workflows.                         |
| Runtime            | Node.js LTS                        | Stable production runtime for the Next.js server.                                                   |
| Validation         | Zod                                | Shared runtime validation for forms, API payloads and public RSVP endpoints.                        |
| Database           | MongoDB Atlas                      | Managed MongoDB cluster; flexible document model fits wedding-related entities.                     |
| ODM                | Mongoose                           | Schema modeling, validation, middleware and TypeScript-friendly domain definitions.                 |
| Authentication     | Auth.js                            | Next.js-friendly authentication with email/password and Google OAuth.                               |
| Password hashing   | Argon2id                           | Strong password hashing for local credentials.                                                      |
| UI                 | Tailwind CSS + shadcn/ui           | Fast, consistent component foundation with custom wedding styling.                                  |
| Media storage      | Amazon S3                          | Durable object storage suited to large photo/doc files.                                             |
| Media delivery     | CloudFront                         | Efficient public gallery delivery and caching.                                                      |
| Runtime hosting    | Amazon ECS Fargate                 | Managed Docker execution while keeping one application image/deployment unit.                       |
| Container registry | Amazon ECR                         | Private image registry for CI/CD deployments.                                                       |
| Secrets            | AWS Secrets Manager                | Centralized storage for database URI, OAuth and integration secrets.                                |
| Email              | Amazon SES                         | Transactional email for password reset and future optional email workflows.                         |
| Scheduling         | EventBridge Scheduler              | Managed trigger for reminder/job ticks without a message-broker platform.                           |
| Monitoring         | CloudWatch                         | Logs, metrics and alarms for AWS runtime and application operations.                                |
| Livestream         | External provider; embedded player | Avoids building video ingest/transcoding/CDN infrastructure in V1.                                  |

# 4. High-Level Architecture

The system consists of four major zones: client experience, application
layer, persistent data/media, and managed integrations. The application
remains the single business-control point for tenant context,
authorization and domain rules.

## 4.1 Request path

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Browser / mobile browser<br />
|<br />
v<br />
Route 53 -&gt; CloudFront + AWS WAF -&gt; Application Load
Balancer<br />
|<br />
v<br />
ECS Fargate -&gt; Dockerized Next.js application<br />
|<br />
+--&gt; MongoDB Atlas<br />
+--&gt; S3 / CloudFront for media<br />
+--&gt; SES / Google OAuth / livestream provider</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 4.2 Responsibilities

| **Component**         | **Primary responsibility**                                                                                                                         |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| Next.js application   | UI, server rendering, route handlers, server actions, authentication integration, authorization, business logic and orchestration.                 |
| MongoDB Atlas         | Users, weddings, membership, events, tasks, guests, RSVP, invitations, expenses, vendors, notifications, issues, audit records and media metadata. |
| Amazon S3             | Original photos, optimized photos, thumbnails, vendor documents and future media objects.                                                          |
| CloudFront            | Public wedding assets and gallery image delivery; caching close to guests.                                                                         |
| AWS WAF               | Public attack protection and rate-based controls for login, invitation and RSVP endpoints.                                                         |
| ECS Fargate           | Runs the Dockerized Node.js / Next.js application.                                                                                                 |
| EventBridge Scheduler | Triggers scheduled reminder/maintenance checks.                                                                                                    |

# 5. Multi-Tenancy Architecture

Multi-tenancy is a core requirement. The tenant boundary is a wedding
workspace. In V1, tenantId and the wedding document \_id represent the
same identifier. There is no separate tenant service or tenant-specific
database.

<img src="Make_My_Marriage_System_Design_Document_assets/image2.png"
style="width:6.4in;height:7.28276in" />

*Figure 2. Tenant-isolation flow: the server derives tenant context from
authenticated membership and applies it to every tenant-owned repository
query.*

## 5.1 Isolation model

- Shared MongoDB Atlas cluster and shared collections across weddings.

- Every tenant-owned document contains tenantId.

- Every repository query for tenant-owned data must include tenantId.

- tenantId is never trusted from the client for authenticated
  operations; it is derived from the current session and membership.

- Public guest operations derive tenant context from the invitation
  token mapping.

- Sensitive operations require both tenant membership and permission
  validation.

- All primary indexes for tenant-scoped workloads begin with tenantId
  where practical.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Non-negotiable security rule</strong></p>
<p>A user can never select an arbitrary tenantId in a request and gain
access to another wedding. Tenant context must come from trusted
server-side context: session membership for members or a valid opaque
invitation token for guests.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 5.2 Tenant lifecycle

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>User signs up<br />
-&gt; creates wedding<br />
-&gt; wedding document becomes tenant root<br />
-&gt; owner membership created<br />
-&gt; default roles/permissions assigned<br />
-&gt; tenant is ready for collaboration</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 5.3 Membership constraint

Because one account manages one wedding at a time, the WeddingMembership
collection should enforce at most one active or suspended membership per
user. Use a partial unique index on userId for those statuses. Preserve
REMOVED membership records for audit; a removed user may later join
another wedding. Store pending invitations separately so they can exist
before the invitee has an account.

# 6. Application / Module Architecture

The monolith is divided into business modules. Route handlers and Server
Actions remain thin; business rules belong to module services; MongoDB
access belongs to repositories. This prevents domain logic from becoming
scattered through UI code.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>src/<br />
app/<br />
(auth)/<br />
(dashboard)/<br />
invite/[token]/<br />
wedding/[slug]/<br />
api/<br />
<br />
modules/<br />
auth/<br />
wedding/<br />
members/<br />
roles/<br />
events/<br />
tasks/<br />
guests/<br />
rsvp/<br />
invitations/<br />
expenses/<br />
vendors/<br />
notifications/<br />
gallery/<br />
livestream/<br />
issues/<br />
activity/<br />
<br />
lib/<br />
db/<br />
auth/<br />
storage/<br />
security/<br />
scheduling/<br />
observability/<br />
<br />
components/<br />
types/<br />
config/</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 6.1 Module contract

| **Layer**                     | **Rule**                                                                                |
|-------------------------------|-----------------------------------------------------------------------------------------|
| UI                            | Collects input, displays state, calls server actions or APIs. No direct MongoDB access. |
| Route Handler / Server Action | Authenticates request, resolves tenant context, validates input, calls service.         |
| Service                       | Owns business rules and cross-entity orchestration.                                     |
| Repository                    | Owns MongoDB queries and transaction boundaries.                                        |
| Schema                        | Zod input/output validation; Mongoose model validation where applicable.                |
| Integration adapter           | Encapsulates S3, SES, Google OAuth and livestream provider details.                     |

# 7. Authentication and Authorization

## 7.1 Authentication

- Email + password authentication.

- Google OAuth login.

- Forgot/reset password flow via transactional email.

- No phone/OTP authentication in V1.

- Guests have no accounts.

- Use secure, HTTP-only cookies and server-side session validation.

## 7.2 Session design

Use Auth.js with a secure session cookie. Keep only stable identity
claims in the session. Do not permanently embed mutable permissions in
the client token. For sensitive actions, the server resolves the current
membership and permissions from MongoDB before mutation.

## 7.3 RBAC and custom permissions

| **Permission family** | **Examples**                                    |
|-----------------------|-------------------------------------------------|
| Wedding               | VIEW_WEDDING, MANAGE_WEDDING, MANAGE_MEMBERS    |
| Events                | VIEW_EVENTS, MANAGE_EVENTS                      |
| Tasks                 | VIEW_TASKS, MANAGE_TASKS                        |
| Guests                | VIEW_GUESTS, MANAGE_GUESTS, IMPORT_GUESTS       |
| RSVP / Invitations    | VIEW_RSVP, MANAGE_INVITATIONS                   |
| Expenses              | VIEW_EXPENSES, MANAGE_EXPENSES, MANAGE_PAYMENTS |
| Vendors               | VIEW_VENDORS, MANAGE_VENDORS                    |
| Gallery               | VIEW_GALLERY, UPLOAD_PHOTOS, MANAGE_ALBUMS      |
| Livestream            | MANAGE_LIVESTREAM                               |
| Issues                | VIEW_ISSUES, REPORT_ISSUES, MANAGE_ISSUES       |

Roles reference permission codes. A wedding can use system-defined roles
and can create a custom role by selecting a set of permission codes.

# 8. MongoDB Data Architecture

MongoDB Atlas is the authoritative operational database. Collections use
a shared-collection multi-tenant model. The schema is document-oriented
but should preserve clear references between major entities.

## 8.1 Core collections

| **Collection**      | **Purpose**                                            | **Tenant scoped?**                        |
|---------------------|--------------------------------------------------------|-------------------------------------------|
| users               | Authenticated human accounts.                          | Partially / membership determines tenant. |
| weddings            | Tenant root and public wedding profile.                | Root.                                     |
| wedding_members | User-to-wedding membership and role assignment.        | Yes.                                      |
| roles               | System/custom roles and permission codes.              | Yes for custom roles.                     |
| member_invitations  | Pending invitations for people joining a wedding.      | Yes.                                      |
| events              | Wedding ceremonies/events and schedule.                | Yes.                                      |
| tasks               | Planning tasks and assignments.                        | Yes.                                      |
| guest_groups        | Family/household grouping and primary RSVP respondent. | Yes.                                      |
| guests              | Individual guest records.                              | Yes.                                      |
| rsvps               | RSVP response and attendee selection.                  | Yes.                                      |
| invitations         | Personalized invitation recipients and delivery state. | Yes.                                      |
| expenses            | Expense and payment records.                           | Yes.                                      |
| vendors             | Vendor records and financial status.                   | Yes.                                      |
| vendor_documents    | Metadata for contracts/attachments stored in S3.       | Yes.                                      |
| notifications       | In-app notifications for members.                      | Yes.                                      |
| reminders           | Scheduled reminder definitions and next run.           | Yes.                                      |
| photo_albums        | Event-based gallery albums.                            | Yes.                                      |
| photos              | Photo metadata and S3 object keys.                     | Yes.                                      |
| livestreams         | External stream configuration per event.               | Yes.                                      |
| issues              | Reported problems and resolution workflow.             | Yes.                                      |
| activity_logs       | Important user/system changes for audit/history.       | Yes.                                      |

## 8.2 Example document patterns

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Guest<br />
{<br />
_id,<br />
tenantId,<br />
groupId,<br />
name,<br />
normalizedPhone,<br />
normalizedEmail,<br />
side,<br />
relationship,<br />
rsvpStatus,<br />
invitationStatus,<br />
notes,<br />
createdAt, updatedAt<br />
}<br />
<br />
Task<br />
{<br />
_id, tenantId, eventId, title, description,<br />
assignedToUserId, dueAt, priority, status,<br />
checklist[], createdAt, updatedAt<br />
}<br />
<br />
Photo<br />
{<br />
_id, tenantId, eventId, albumId,<br />
originalKey, webKey, thumbKey,<br />
width, height, contentType, fileSize,<br />
uploadedByUserId, createdAt<br />
}</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 8.3 Recommended indexes

| **Collection**      | **Recommended index**                                                     |
|---------------------|---------------------------------------------------------------------------|
| users               | unique normalizedEmail                                                    |
| wedding_members | partial unique userId for active/suspended; unique tenantId + userId |
| member_invitations  | partial unique tenantId + normalizedEmail while pending; unique tokenHash |
| events              | tenantId + startAt                                                        |
| tasks               | tenantId + status + dueAt; tenantId + assignedToUserId + status           |
| guest_groups        | tenantId + normalizedFamilyName                                           |
| guests              | tenantId + normalizedPhone; tenantId + normalizedName; tenantId + groupId |
| rsvps               | unique tenantId + guestGroupId; tenantId + status                         |
| invitations         | unique tokenHash; unique tenantId + guestId                               |
| expenses            | tenantId + dueAt + paymentStatus; tenantId + category                     |
| vendors             | tenantId + name; tenantId + eventId                                       |
| notifications       | tenantId + recipientUserId + readAt + createdAt                           |
| reminders           | tenantId + status + nextRunAt                                             |
| photos              | tenantId + eventId + createdAt; tenantId + albumId + createdAt            |
| issues              | tenantId + status + createdAt; tenantId + assignedToUserId + status       |
| activity_logs       | tenantId + createdAt; tenantId + actorUserId + createdAt                  |

## 8.4 Transactions and concurrency

- Use MongoDB transactions when multiple related records must
  succeed/fail together, such as initial wedding creation with owner
  membership and default roles.

- Use atomic update operators for counters/status transitions where
  possible.

- Use optimistic concurrency (updatedAt/version checks) for high-value
  collaborative edits when overwriting another member is undesirable.

- Do not hold long-lived database transactions across network calls to
  external providers.

# 9. Media and File Storage Architecture

Photos and vendor documents are stored in Amazon S3. MongoDB stores
metadata and object references only. Initial target storage is 5 GB per
wedding.

<img src="Make_My_Marriage_System_Design_Document_assets/image3.png"
style="width:6.4in;height:1.57681in" />

*Figure 3. Photo upload flow: direct S3 upload plus browser-generated
optimized and thumbnail variants keeps the main application simple.*

## 9.1 Photo upload strategy

- Admin or Photographer authenticates and passes the UPLOAD_PHOTOS
  permission check.

- Next.js issues short-lived presigned S3 upload URLs.

- Browser uploads original and optimized/thumbnail variants directly to
  S3.

- Browser sends metadata completion request to Next.js; server validates
  the tenant and event before persisting photo metadata.

- The application never trusts a client-provided S3 key without
  verifying that it belongs to the current tenant.

## 9.2 Object key convention

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>weddings/{tenantId}/events/{eventId}/photos/{photoId}/original.ext<br />
weddings/{tenantId}/events/{eventId}/photos/{photoId}/optimized.webp<br />
weddings/{tenantId}/events/{eventId}/photos/{photoId}/thumbnail.webp<br />
weddings/{tenantId}/vendors/{vendorId}/documents/{documentId}/file.ext</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 9.3 Access model

| **Asset**                              | **Access**                                                                      |
|----------------------------------------|---------------------------------------------------------------------------------|
| Public gallery web images / thumbnails | Public through CloudFront because the product defines wedding photos as public. |
| Original photo download                | Short-lived signed URL generated after public gallery action.                   |
| Vendor documents                       | Authenticated + authorized members/vendor only; never public.                   |
| Temporary upload state                 | Short-lived and server validated.                                               |

## 9.4 Supported media for V1

To keep the first implementation predictable, support common image
formats such as JPEG, PNG and WebP. A future media pipeline can add
HEIC/RAW handling if needed.

# 10. API and Application Communication

The application uses a mix of Server Actions and Route Handlers. The key
rule is that both call the same module services; business logic is never
duplicated between UI pathways.

## 10.1 Use Server Actions for

- Authenticated dashboard mutations closely coupled to Next.js forms.

- Simple CRUD operations where a public API contract is not required.

- Actions that benefit from server-side form handling and revalidation.

## 10.2 Use Route Handlers for

- Public invitation and RSVP endpoints.

- Presigned upload URL creation.

- Webhooks / external callbacks when introduced.

- Integration endpoints and automation endpoints.

- Future external API consumers.

## 10.3 API conventions

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>/api/v1/wedding<br />
/api/v1/members<br />
/api/v1/events<br />
/api/v1/tasks<br />
/api/v1/guests<br />
/api/v1/rsvp<br />
/api/v1/invitations<br />
/api/v1/expenses<br />
/api/v1/vendors<br />
/api/v1/photos<br />
/api/v1/livestreams<br />
/api/v1/issues<br />
/api/v1/notifications<br />
<br />
HTML: /invite/{token}<br />
HTML: /wedding/{slug}<br />
API: /api/v1/public/invitations/{token}<br />
API: /api/v1/public/invitations/{token}/rsvp</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 10.4 Standard request pipeline

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Request<br />
-&gt; authentication (when required)<br />
-&gt; tenant context resolution<br />
-&gt; permission check<br />
-&gt; Zod validation<br />
-&gt; service method<br />
-&gt; repository / integration<br />
-&gt; audit event (when material)<br />
-&gt; response</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 11. Core Data Flows

## 11.1 Wedding creation

1.  User authenticates.

2.  System confirms the user does not already belong to a wedding.

3.  Create wedding/tenant root.

4.  Create owner membership.

5.  Create default system roles for the wedding.

6.  Commit the transaction.

7.  Redirect user to setup wizard/dashboard.

## 11.2 Family member invitation

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Admin selects member + role<br />
-&gt; create pending member invitation<br />
-&gt; generate opaque one-time token<br />
-&gt; invitee receives link / shared link<br />
-&gt; invitee authenticates or registers<br />
-&gt; server checks token + one-wedding constraint<br />
-&gt; membership created<br />
-&gt; invitation marked accepted</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 11.3 Guest creation / import

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Manual or CSV import<br />
-&gt; normalize name/phone/email<br />
-&gt; tenant-scoped duplicate detection<br />
-&gt; show possible matches<br />
-&gt; user confirms create/merge<br />
-&gt; store individual guest records<br />
-&gt; optional guest group assignment<br />
-&gt; activity log</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 11.4 Expense entry

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Authorized member<br />
-&gt; validate amount/category/event/vendor<br />
-&gt; create expense<br />
-&gt; optionally associate payment due date<br />
-&gt; write activity log<br />
-&gt; dashboard aggregates update through queries/derived totals</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 11.5 Issue reporting

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Member or invited guest<br />
-&gt; submit title + description<br />
-&gt; rate-limit / validate<br />
-&gt; create issue<br />
-&gt; assign responsible member if known<br />
-&gt; notify authorized member(s)<br />
-&gt; lifecycle: OPEN -&gt; IN PROGRESS -&gt; RESOLVED</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 12. Notifications and Background Processing

The architecture avoids a message broker in V1. In-app notifications are
stored in MongoDB. Scheduled reminders are processed by a lightweight
job tick triggered by EventBridge Scheduler.

## 12.1 Reminder model

| **Reminder type** | **Example**                                  |
|-------------------|----------------------------------------------|
| Event reminder    | “Sangeet starts tomorrow at 7:00 PM.”        |
| Task reminder     | “Photographer booking task is due tomorrow.” |
| Payment reminder  | “Vendor payment is due tomorrow.”            |
| RSVP reminder     | In-app notice to authorized members that 210 guests have not responded. |
| Wedding update    | “Sangeet timing has changed.”                |

## 12.2 Job execution

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>EventBridge Scheduler (e.g. every minute)<br />
|<br />
v<br />
Authenticated internal job route<br />
|<br />
v<br />
MongoDB lease/lock<br />
|<br />
v<br />
Find due reminders<br />
|<br />
v<br />
Create in-app notifications + update nextRunAt<br />
|<br />
v<br />
Release lease</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

The MongoDB lease prevents duplicate reminder processing when the
application is horizontally scaled. No Redis-based distributed lock is
required in V1.

## 12.3 Notification delivery

V1 focuses on in-app notifications. WhatsApp delivery is intentionally
Phase 2. The notification service should still expose a channel
abstraction so future WhatsApp delivery can reuse the same reminder
definitions.

# 13. Wedding Invitation and Guest Access

Guests do not need accounts. The public experience is intentionally
simple and mobile-first.

<img src="Make_My_Marriage_System_Design_Document_assets/image4.png"
style="width:6.4in;height:0.46911in" />

*Figure 4. Guest RSVP flow using an opaque invitation token and no guest
account.*

## 13.1 Public wedding page

- Wedding profile and couple information.

- Event dates, times and venues.

- Story / invitation content.

- Public livestream link/player.

- Event-based photo galleries.

- RSVP entry point.

## 13.2 Personalized invitation link

Invitation links should use a high-entropy opaque token. Store a secure
hash of the token in MongoDB rather than storing the raw secret in
plaintext where practical. The URL does not expose guest identifiers
directly.

## 13.3 Token rules

- No automatic expiration in V1.

- Token is validated before showing guest-scoped information or
  accepting RSVP.

- Token lookup is indexed and rate-limited.

- A token can be manually regenerated/revoked later without deleting the
  wedding.

- Public pages must not expose private guest list, phone numbers,
  expenses or internal tasks.

# 14. Livestream Architecture

Make My Marriage does not build a custom video streaming stack in V1.
The product stores event-level livestream configuration and embeds an
external provider player on the public wedding page.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Organizer/Admin<br />
-&gt; create event livestream record<br />
-&gt; store provider + embed URL + start time<br />
-&gt; public wedding page renders player<br />
-&gt; guests watch without Make My Marriage accounts</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

A provider such as YouTube Live is a reasonable V1 implementation
because it removes ingest, transcoding, scaling and video delivery
concerns from the product.

# 15. Deployment Architecture

<img src="Make_My_Marriage_System_Design_Document_assets/image5.png"
style="width:6.4in;height:4.22888in" />

*Figure 5. Recommended AWS deployment: a single Dockerized Next.js
application on ECS Fargate with managed supporting services.*

## 15.1 AWS components

| **AWS / managed service** | **Purpose**                                                             |
|---------------------------|-------------------------------------------------------------------------|
| Route 53                  | DNS for application and public wedding domains/subdomains.              |
| CloudFront                | TLS edge, caching, public photo delivery and integration point for WAF. |
| AWS WAF                   | Rate-based controls and web attack filtering for public endpoints.      |
| Application Load Balancer | Routes HTTPS traffic to the ECS service and performs health checks.     |
| ECS Fargate               | Runs the Next.js container.                                             |
| ECR                       | Stores immutable application container images.                          |
| S3                        | Photos, optimized images, thumbnails and vendor documents.              |
| Secrets Manager           | Runtime secrets.                                                        |
| CloudWatch                | Logs, metrics, alarms and operational visibility.                       |
| EventBridge Scheduler     | Triggers reminder/maintenance execution.                                |
| SES                       | Transactional email for password reset and future email workflows.      |

## 15.2 Container strategy

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>Docker image<br />
-&gt; install dependencies<br />
-&gt; build Next.js application<br />
-&gt; run Node.js production server<br />
<br />
Health endpoints:<br />
/api/health/live<br />
/api/health/ready</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

The same application image is used across development, staging/UAT and
production, with environment-specific secrets/configuration injected at
runtime.

# 16. Security Architecture

## 16.1 Security controls

| **Threat / failure mode**      | **Primary control**                                                                            |
|--------------------------------|------------------------------------------------------------------------------------------------|
| Cross-tenant data access       | Mandatory tenant context + repository scoping + membership authorization.                      |
| Privilege escalation           | Permission checks on server-side mutations; never trust UI visibility.                         |
| Invitation token guessing      | High-entropy opaque tokens, hashed token storage, rate limiting.                               |
| RSVP spam                      | AWS WAF rate rules + token validation + payload validation.                                    |
| Malicious file upload          | Presigned uploads, content-type/size allowlist, server metadata validation, private S3 bucket. |
| XSS in user content            | Output escaping/sanitization; do not render arbitrary HTML from wedding fields.                |
| Credential compromise          | Argon2id password hashing, secure cookies, HTTPS, password reset controls.                     |
| Secret leakage                 | AWS Secrets Manager; never commit secrets to Git.                                              |
| Data exfiltration through logs | Do not log guest phone/email, invitation tokens, passwords or raw document contents.           |
| Abuse of public endpoints      | WAF + request validation + low-cost server-side abuse controls.                                |

## 16.2 Data classification

| **Data class**      | **Examples**                                                               | **Access**                       |
|---------------------|----------------------------------------------------------------------------|----------------------------------|
| Public              | Wedding profile, event schedule, venue, public gallery, public livestream. | Internet.                        |
| Guest-scoped        | Invitation identity and own RSVP interaction.                              | Valid invitation token.          |
| Private operational | Guest phone/email, tasks, expenses, vendor records, internal issues.       | Authorized wedding members only. |
| Sensitive secrets   | DB URI, OAuth secrets, S3 signing credentials, session secrets.            | Secrets Manager / runtime only.  |

# 17. Reliability, Backup and Disaster Recovery

## 17.1 Database

- Use MongoDB Atlas backup capabilities appropriate to the selected
  production tier.

- Test restore procedures before production launch and periodically
  afterward.

- Keep application code and infrastructure configuration version
  controlled so the app can be rebuilt independently of a single server.

## 17.2 Object storage

- Enable S3 durability features and protect the bucket from accidental
  public write access.

- Keep wedding photos/documents in stable tenant-prefixed keys.

- Do not configure automatic post-wedding deletion. Wedding content
  remains available until a future retention policy is explicitly
  defined.

- Temporary multipart upload cleanup is allowed because it targets
  abandoned temporary state, not stored wedding content.

## 17.3 Recommended operational targets

| **Area**     | **Initial design target**                                                               |
|--------------|-----------------------------------------------------------------------------------------|
| Availability | Design for production high availability within a single AWS region.                     |
| RPO          | Target \<= 24 hours initially; tighten when operational maturity and budget justify it. |
| RTO          | Target \<= 4 hours initially; validate through restore exercises.                       |
| Backups      | Automated managed backups + periodic restore verification.                              |

# 18. Observability and Operations

- Structured JSON application logs.

- Request correlation ID propagated through application logs.

- CloudWatch dashboards for latency, 4xx/5xx rate, ECS health, MongoDB
  connectivity and job execution.

- Application errors must include module and operation context, but no
  secret or unnecessary guest PII.

- Operational alarms for repeated 5xx errors, unhealthy ECS tasks,
  storage/upload failures and reminder job failures.

- Audit/activity logs are stored in MongoDB for user-visible change
  history.

| **Metric**                                  | **Why it matters**                                 |
|---------------------------------------------|----------------------------------------------------|
| Request latency p50/p95                     | Detect slow dashboard and public invitation flows. |
| HTTP 5xx rate                               | Detect application failures.                       |
| MongoDB query latency / connection pressure | Protect database health.                           |
| S3 upload failure rate                      | Detect gallery upload problems.                    |
| Due reminder count / job lag                | Ensure notifications are timely.                   |
| ECS task health / restart count             | Detect container instability.                      |

# 19. Performance and Scalability

## 19.1 Expected scale

The target wedding size is 500–2,000 guests. The application should be
designed so one large wedding does not require a separate architecture
from a small wedding.

## 19.2 Scaling approach

| **Concern**  | **V1 approach**                            | **Scale-up path**                                                 |
|--------------|--------------------------------------------|-------------------------------------------------------------------|
| Web requests | Stateless Next.js application on ECS.      | Increase ECS task count behind ALB.                               |
| Database     | MongoDB Atlas shared cluster with indexes. | Increase Atlas tier / read capacity as usage grows.               |
| Photos       | Direct S3 upload + CloudFront delivery.    | Increase S3 / CDN usage without changing app architecture.        |
| Search       | Indexed MongoDB queries.                   | Atlas Search later if fuzzy/relevance needs justify it.           |
| Reminders    | EventBridge + MongoDB lease/lock.          | Dedicated worker/queue only if workload proves necessary.         |
| Livestream   | External provider.                         | Provider-side scaling; own media pipeline only later if required. |

## 19.3 Caching

- Public, non-personalized wedding pages can be cached at the edge when
  safe.

- Personalized invitation/RSVP pages should not be cached in a way that
  can leak one guest's state to another.

- Public gallery image delivery should be strongly cacheable.

- Avoid introducing Redis solely for caching in V1; application/database
  indexing is sufficient for initial scale.

# 20. Environment Strategy

| **Environment** | **Purpose**                     | **Data**                                                                               |
|-----------------|---------------------------------|----------------------------------------------------------------------------------------|
| Development     | Local developer work.           | Synthetic/local test data or isolated Atlas dev database.                              |
| Staging / UAT   | Pre-production validation.      | Separate environment and credentials; never use production guest data.                 |
| Production      | Real weddings and public pages. | Production Atlas cluster/database, production S3 bucket/prefix and production secrets. |

## 20.1 Configuration

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>NODE_ENV=production<br />
MONGODB_URI=&lt;secret&gt;<br />
AUTH_SECRET=&lt;secret&gt;<br />
AUTH_GOOGLE_ID=&lt;secret&gt;<br />
AUTH_GOOGLE_SECRET=&lt;secret&gt;<br />
S3_BUCKET=&lt;secret/config&gt;<br />
AWS_REGION=&lt;config&gt;<br />
SES_FROM_EMAIL=&lt;config&gt;<br />
INTERNAL_JOB_SECRET=&lt;secret&gt;</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Secrets are injected at runtime. No secret belongs in source control,
Docker images, client-side JavaScript or public configuration.

# 21. Development and Repository Structure

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>make-my-marriage/<br />
├── app/<br />
├── modules/<br />
├── components/<br />
├── lib/<br />
├── hooks/<br />
├── styles/<br />
├── public/<br />
├── tests/<br />
├── scripts/<br />
├── Dockerfile<br />
├── docker-compose.yml<br />
├── package.json<br />
└── README.md</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 21.1 Module example

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>modules/guests/<br />
guest.model.ts<br />
guest.schema.ts<br />
guest.repository.ts<br />
guest.service.ts<br />
guest.permissions.ts<br />
guest.types.ts<br />
guest.duplicate.ts<br />
index.ts</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

A module should not reach into another module's repository directly.
Cross-module actions should go through exported service interfaces.

# 22. Testing Strategy

| **Test layer**         | **Focus**                                                                                                                 |
|------------------------|---------------------------------------------------------------------------------------------------------------------------|
| Unit                   | Pure business rules: permission checks, duplicate detection, RSVP transitions, expense calculations, reminder scheduling. |
| Repository integration | MongoDB queries, indexes, tenant scoping and transaction behavior.                                                        |
| API / route tests      | Authentication, authorization, validation and public token flows.                                                         |
| Component / UI         | Forms, dashboard states, guest lists, RSVP page and photo gallery behavior.                                               |
| End-to-end             | Create wedding -\> add family -\> add guests -\> send invitation -\> RSVP -\> plan event -\> upload gallery content.      |
| Security tests         | Cross-tenant access attempts, privilege escalation, token guessing, upload abuse and XSS payloads.                        |

## 22.1 Critical tenant-isolation tests

- Authenticated user from Wedding A cannot read Wedding B guests by
  changing IDs.

- Authenticated user from Wedding A cannot update Wedding B
  expense/event/task documents.

- Custom role with missing permission cannot call the protected mutation
  even if UI hides it.

- Guest token from Wedding A cannot access guest-scoped data from
  Wedding B.

- S3 keys for one tenant cannot be used to obtain another tenant's
  private vendor documents.

# 23. Architecture Decisions and Trade-offs

| **Decision**         | **Chosen approach**                                      | **Trade-off / rationale**                                                                     |
|----------------------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Architecture style   | Modular monolith                                         | Less operational complexity; requires disciplined module boundaries.                          |
| Multi-tenancy        | Shared MongoDB collections + tenantId                    | Most economical and simple; requires rigorous query scoping.                                  |
| Backend              | Next.js server-side application; no separate Express API | One codebase and deployment; external API boundaries can still be exposed via Route Handlers. |
| Database access      | Mongoose repositories                                    | Stronger domain structure; some ODM overhead.                                                 |
| Guest authentication | No account; invitation token                             | Best UX; token security becomes important.                                                    |
| Photo processing     | Browser generates web/thumb variants in V1               | Keeps architecture simple; heavy client processing is a future optimization point.            |
| Media storage        | S3                                                       | Best fit for large objects; adds storage/CDN configuration.                                   |
| Background jobs      | EventBridge + MongoDB lease                              | No queue infrastructure; less sophisticated for very high job volumes.                        |
| Livestream           | External provider                                        | Fastest and cheapest; provider UX/limits are accepted in V1.                                  |
| Business model       | Free                                                     | No billing complexity; future monetization can be introduced later.                           |

# 24. Future Evolution Path

The architecture is designed to evolve without requiring a rewrite. The
next steps should be driven by observed scale or product requirements,
not speculation.

| **Future need**                            | **Evolution**                                                                                                                      |
|--------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Professional planners manage many weddings | Allow planner accounts to belong to multiple tenants; introduce planner organization entity without changing existing tenant data. |
| WhatsApp automation                        | Add WhatsApp provider adapter to the notification service.                                                                         |
| Very large media processing workload       | Introduce an asynchronous image worker, potentially using the same application codebase/image first.                               |
| Advanced search                            | Add MongoDB Atlas Search rather than a separate search platform.                                                                   |
| High reminder volume                       | Introduce SQS/worker processing if scheduler + lease model becomes a bottleneck.                                                   |
| Custom invitation designer                 | Add a template/theme subsystem on top of the existing invitation model.                                                            |
| Billing                                    | Add subscription/entitlement module later; no current dependency exists on billing.                                                |
| Own livestream infrastructure              | Only after usage justifies operating video ingest/transcoding/CDN.                                                                 |

# 25. Risks and Mitigations

| **Risk**                               | **Impact**  | **Mitigation**                                                                                |
|----------------------------------------|-------------|-----------------------------------------------------------------------------------------------|
| Tenant isolation bug                   | Critical    | Centralized tenant context middleware + repository conventions + automated isolation tests.   |
| Guest token leaked                     | Medium/High | High-entropy tokens, hashed storage, rate limiting, manual regeneration.                      |
| Photo storage grows quickly            | Medium      | 5 GB initial product target, optimized variants, S3 lifecycle only for temporary artifacts.   |
| Large wedding causes slow guest list   | Medium      | Compound indexes, server pagination, debounced search, avoid loading all guests into browser. |
| Reminder duplicates                    | Medium      | MongoDB lease/lock + idempotent notification creation.                                        |
| Vendor document leak                   | High        | Private S3 bucket, tenant-scoped authorization, short-lived download URLs.                    |
| Monolith becomes hard to maintain      | Medium      | Strict modules, services/repositories, no cross-module repository access.                     |
| Browser photo processing becomes heavy | Medium      | Batch limits, worker-based processing as a later optimization.                                |

# 26. Final Architecture Summary

The recommended Make My Marriage architecture is a multi-tenant modular
monolith. Each wedding is a tenant, each user account belongs to at most
one wedding, and guests use public pages plus opaque invitation links
without accounts. A single Dockerized Next.js application on AWS owns
the product logic, while MongoDB Atlas stores operational data and
Amazon S3 stores photos/documents.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>APP<br />
Next.js + TypeScript + Node.js<br />
Modular monolith<br />
|<br />
+--&gt; Auth.js / RBAC / tenant context<br />
+--&gt; Domain services<br />
+--&gt; Route Handlers / Server Actions<br />
|<br />
+--&gt; MongoDB Atlas<br />
| shared collections + tenantId<br />
|<br />
+--&gt; S3<br />
| originals + web + thumbs + documents<br />
|<br />
+--&gt; CloudFront / WAF<br />
|<br />
+--&gt; EventBridge Scheduler<br />
|<br />
+--&gt; SES / Google OAuth / livestream provider<br />
<br />
DEPLOYMENT<br />
Route 53 -&gt; CloudFront/WAF -&gt; ALB -&gt; ECS Fargate<br />
<br />
PRODUCT MODEL<br />
1 wedding = 1 tenant<br />
1 user = max 1 wedding<br />
many members per wedding<br />
guests = no accounts<br />
product = free</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Implementation readiness</strong></p>
<p>This document is intended to be the technical baseline for
implementation. The next engineering artifact should break the design
into database schema definitions, API contracts, screen routes,
permission matrices, and an incremental delivery plan.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>
