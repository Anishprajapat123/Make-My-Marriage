# Make My Marriage
## Product Requirements Document (PRD)

**Product:** Make My Marriage  
**Product Type:** Wedding Planning & Wedding Management SaaS  
**Primary Market:** Indian Weddings  
**Business Model:** Free  
**Document Status:** Product Definition / V1  
**Version:** 1.0

---

# 1. Product Overview

**Make My Marriage** is a digital wedding planning and management platform designed specifically for Indian weddings.

Indian weddings involve many interconnected activities: multiple ceremonies, large guest lists, family coordination, vendors, expenses, invitations, RSVPs, reminders, photography, livestreaming, and last-minute changes.

Today, much of this information is distributed across WhatsApp groups, spreadsheets, notebooks, phone calls, Google Drive, and individual family members' knowledge.

Make My Marriage brings these activities into **one shared wedding workspace**.

The platform allows a bride, groom, family members, wedding organizers, vendors, and guests to interact with the same wedding while seeing only the information and controls relevant to their role.

The central concept is:

> **One Wedding → One Shared Workspace → Multiple People → One Source of Truth**

---

# 2. Product Vision

Make My Marriage should become the **operating system for an Indian wedding**.

It should help a family:

**Plan → Organize → Invite → Track → Communicate → Celebrate → Preserve**

The product should reduce the need for:

- Multiple WhatsApp groups for planning
- Separate spreadsheets for guests
- Separate expense sheets
- Manual RSVP tracking
- Searching through chats for wedding information
- Calling family members to know what has been completed
- Searching through thousands of photos after the wedding

---

# 3. Product Goals

## Primary Goals

1. Give the couple and family one place to manage their wedding.
2. Make wedding planning understandable and easy even for non-technical users.
3. Support a large number of wedding guests, approximately **500–2,000**.
4. Allow multiple family members to collaborate safely.
5. Make it difficult to miss a guest.
6. Simplify invitations and RSVP collection.
7. Track wedding tasks and responsibilities.
8. Track wedding expenses and pending payments.
9. Provide a lightweight organizer/wedding planner dashboard.
10. Provide a simple digital wedding experience for guests.
11. Preserve wedding photos and memories in an organized way.
12. Support a public livestream experience.
13. Build a foundation that can later become a wedding-planner SaaS platform.

---

# 4. Product Non-Goals for V1

The first version intentionally avoids unnecessary complexity.

The following are not part of the core product:

- Multiple weddings per user account
- Hotel/accommodation management
- Transportation management
- Guest check-in/attendance scanning
- Face recognition/photo face search
- Event-specific guest lists
- Complex seating planner
- Complex food-preference workflows
- Private photo galleries
- Complex multi-venue management
- Building a proprietary video streaming infrastructure
- Marketplace for discovering vendors
- Complex financial forecasting
- Large invitation-template editor
- Automatic post-wedding deletion

These may be considered later based on customer feedback.

---

# 5. Target Users

## 5.1 Bride & Groom

Primary users and decision makers.

They should be able to:

- Create the wedding
- Manage wedding information
- Invite family members
- Create events
- Manage guests
- Create invitations
- Track RSVP
- Manage tasks
- Manage expenses
- Manage vendors
- View wedding progress
- Manage gallery and livestream settings

---

## 5.2 Family Members

Trusted wedding collaborators.

Examples:

- Parents
- Siblings
- Cousins
- Relatives
- Other trusted family members

They can be assigned roles and permissions.

---

## 5.3 Wedding Organizer

A person responsible for execution and coordination.

They primarily work with:

- Events
- Timeline
- Tasks
- Vendors
- Guests
- Expenses
- Issues

---

## 5.4 Finance Manager

Responsible for wedding finances.

They can:

- Add expenses
- Edit expenses
- Record payments
- Track pending payments
- View financial summaries

---

## 5.5 Photographer

Responsible for wedding photography uploads.

They can:

- Upload photos
- Organize photos by event
- Manage gallery uploads
- Access photography-related wedding information

---

## 5.6 Vendor

A vendor invited into the wedding workspace.

Examples:

- Photographer
- Caterer
- Decorator
- Makeup artist
- DJ
- Band
- Pandit
- Invitation vendor
- Other service providers

Vendor access should be restricted to information relevant to their role.

---

## 5.7 Guest

Guests do not manage the wedding.

They interact with the public/guest-facing wedding experience:

- View invitation
- View events
- RSVP
- View event updates
- View venue information
- Watch livestream
- View/download photos

---

# 6. Core Product Architecture

The conceptual structure is:

```text
User Account
      |
      v
Wedding Workspace
      |
      +-------------------------------+
      |                               |
      v                               v
   Members                          Guests
      |
      +-------------------------------+
      |
      v
   Events
      |
      +---- Tasks
      +---- Vendors
      +---- Expenses
      +---- Timeline
      +---- Gallery
      +---- Live Stream
      |
      v
Communication
      |
      +---- Invitation
      +---- RSVP
      +---- Notifications
      +---- Reminders
```

---

# 7. Account & Wedding Model

## Requirement

One account manages one wedding.

A user should not manage multiple weddings under the same account in V1.
This limit applies to current memberships; after removal from a wedding,
the account may join or create another wedding.

However, one wedding may contain multiple members.

Example:

```text
Wedding: Anish & Priya

Members:
- Anish
- Priya
- Anish's Father
- Anish's Mother
- Priya's Brother
- Wedding Organizer
- Finance Manager
- Photographer
```

The wedding becomes a shared workspace.

---

# 8. Authentication & Authorization

## Functional Requirements

Users must be able to:

- Register
- Login
- Logout
- Reset password
- Update profile
- Accept wedding invitations
- Join a wedding
- Manage their account

## Authorization

The system must use role-based permissions.

Example:

```text
Bride/Groom
    ↓
Administrative access

Family Admin
    ↓
Broad management access

Family Member
    ↓
Limited assigned access

Finance Manager
    ↓
Expenses / payments

Photographer
    ↓
Gallery

Vendor
    ↓
Assigned vendor functionality

Guest
    ↓
Guest-facing experience
```

## Custom Roles

The wedding owner/admin may create custom roles.

Example:

```text
Role: Invitation Manager

Permissions:
✅ Manage guests
✅ Send invitations
✅ View RSVP
❌ Manage expenses
❌ Manage settings
```

This is preferable to creating dozens of fixed roles.

---

# 9. Wedding Setup

When creating a wedding, the user should provide:

- Bride name
- Groom name
- Couple image
- Wedding name/title
- Wedding date
- Wedding city
- Wedding description
- Preferred language
- Contact information
- Wedding hashtag
- Basic design/theme information

The setup should use a simple guided wizard.

```text
Create Wedding
      ↓
Bride & Groom
      ↓
Wedding Information
      ↓
Add Events
      ↓
Invite Family
      ↓
Add Guests
      ↓
Create Invitation
      ↓
Wedding Dashboard
```

---

# 10. Event Management

Events are a fundamental entity in the system.

A wedding can contain many events.

Examples:

- Engagement
- Haldi
- Mehendi
- Sangeet
- Wedding Ceremony
- Reception
- Custom events

## Event Fields

Each event should support:

- Name
- Description
- Date
- Start time
- End time
- Venue
- Dress code
- Timeline/activities
- Notes
- Reminders
- Tasks
- Vendors
- Expenses
- Gallery
- Livestream

## Venue

Each event can have its own venue.

Complex multi-venue management is not required.

Additional directions/instructions can be added as notes or reminders.

---

# 11. Wedding Timeline

The system should provide a chronological view of the entire wedding.

Example:

```text
15 October
Haldi
5:00 PM

16 October
Mehendi
6:00 PM

17 October
Sangeet
7:00 PM

18 October
Wedding
6:00 PM

19 October
Reception
7:00 PM
```

The timeline should allow users to quickly understand what happens before and after each event.

---

# 12. Main Wedding Dashboard

The dashboard is the central page of the application.

It should answer:

> **What is happening with my wedding?**

## Dashboard Components

### Wedding Header

- Couple name
- Couple photo
- Wedding date
- Countdown

### Upcoming Event

- Event name
- Date
- Time
- Venue
- Next activity

### Planning Summary

```text
Tasks
37 / 52 complete

Guests
742

RSVP
624 confirmed

Expenses
₹4,82,500

Vendors
12 active
```

### Attention Required

Examples:

- Overdue tasks
- Upcoming payments
- Guests without RSVP
- Vendor issues
- Recently reported problems

### Recent Activity

Example:

```text
Priya added 5 guests

Rahul completed "Book Photographer"

Anish changed Sangeet timing
```

---

# 13. Task Planner

The task system should be optimized for wedding planning.

## Task Fields

- Title
- Description
- Assigned person
- Event
- Due date
- Priority
- Status
- Checklist/subtasks
- Comments
- Activity history

## Status

```text
TODO
IN PROGRESS
WAITING
COMPLETED
```

## Priority

```text
LOW
MEDIUM
HIGH
```

## Task Views

- All tasks
- My tasks
- Upcoming
- Overdue
- Completed
- By event
- By member
- By priority

## Default Wedding Tasks

The application should provide optional templates such as:

- Book venue
- Finalize photographer
- Finalize caterer
- Finalize decoration
- Purchase clothes
- Order invitations
- Send invitations
- Confirm guest list
- Finalize wedding schedule

Users can add custom tasks.

---

# 14. Expense Tracker

The expense tracker helps families understand wedding expenditure.

## Expense Fields

- Expense name
- Amount
- Category
- Event
- Paid by
- Vendor
- Payment status
- Due date
- Notes

## Categories

- Venue
- Catering
- Decoration
- Photography
- Clothes
- Jewellery
- Invitations
- Makeup
- Entertainment
- Gifts
- Miscellaneous

## Financial States

The platform should support:

```text
Estimated
Committed
Paid
```

## Dashboard Summary

```text
Total Budget
₹10,00,000

Total Spent
₹6,40,000

Remaining
₹3,60,000

Pending Payments
₹1,10,000
```

## Payment Reminders

The system should notify authorized users about upcoming payment due dates.

No complex budget-alert engine is required for V1.

## Access

Expense data must be visible only to authorized members.

---

# 15. Guest Management

Guest management is one of the most important product modules.

Primary objective:

> **Help families avoid missing anyone.**

## Guest Fields

- Name
- Phone
- Email
- Family
- Relationship
- Bride/groom side
- Number of people
- RSVP status
- Notes

## Family Structure

Guests can be grouped into families.

Example:

```text
Sharma Family
    Raj
    Neha
    Rahul
    Priya
```

## Guest Actions

- Add
- Edit
- Remove
- Search
- Filter
- Sort
- Group
- Import
- Add family
- Add family member
- Invite
- View RSVP

## Duplicate Prevention

The system must detect likely duplicates.

Example:

```text
Rahul Sharma
rahul@email.com
9876543210
```

If another guest with highly similar identifying information is added, the system should warn the user before creating a duplicate.

## Guest Scale

The system should support approximately:

**500–2,000 guests per wedding**

The UI must remain performant at this scale.

---

# 16. Guest Invitations

Guests should receive personalized invitation links.

Example:

```text
makemymarriage.com/invite/<opaque-token>
```

The invitation page can recognize the guest.

Example:

```text
Hello Rahul 👋

You are invited to celebrate
Anish & Priya's wedding.
```

This also allows the system to associate invitation and RSVP activity with the correct guest.

---

# 17. Digital Wedding Invitation

The invitation is a public-facing wedding website.

## Components

- Bride & groom
- Couple photo
- Wedding story
- Wedding events
- Dates
- Venue
- Directions
- RSVP
- Livestream
- Gallery
- Contact information

## Languages

V1:

- English
- Hindi

No large multi-language translation system is required initially.

## Sharing

Invitation can be shared through:

- WhatsApp
- Copy link
- Other standard sharing mechanisms

A unique invitation link should be available for each guest.

No QR-code requirement in V1.

---

# 18. RSVP

RSVP is mandatory for invited guests.

The guest should experience a very simple flow.

```text
Will you attend?

YES
NO

Number of guests:
[ 2 ]
```

The system should not collect unnecessary information in V1.

No:

- Accommodation forms
- Transportation forms
- Detailed food surveys
- Long questionnaires

## RSVP Dashboard

Example:

```text
INVITED        1,240
CONFIRMED        820
DECLINED         210
PENDING          210
```

---

# 19. Notifications & Reminders

The platform requires a reusable notification system.

## Guest Invitation Reminders (Phase 2)

Guest reminders are out of scope for V1. Authorized wedding members can
see pending RSVPs and receive in-app notifications/reminders. Guest email
reminders may be considered in Phase 2; WhatsApp is a later integration.

Future guest reminder flow:

```text
Invitation Sent
       ↓
No RSVP
       ↓
Reminder
       ↓
Still No Response
       ↓
Final Reminder
```

## Event Reminders

Examples:

- Event tomorrow
- Event starting soon
- Venue/timing update
- Schedule change

## Task Reminders

Examples:

- Task due tomorrow
- Task overdue

## Payment Reminders

Examples:

- Payment due tomorrow
- Payment overdue

## Channels

V1 delivers notifications and reminders to authenticated wedding members
in-app. Authentication and system-critical email may use email delivery.
Guest-facing reminder channels are deferred to Phase 2. The architecture
should allow later support for:

- WhatsApp integration

WhatsApp is especially important for the Indian market.

---

# 20. Vendor Management

Vendor management should be available without becoming a complex ERP system.

## Vendor Categories

- Venue
- Photographer
- Caterer
- Decorator
- Makeup artist
- Mehendi artist
- DJ
- Band
- Pandit
- Invitation provider
- Other

## Vendor Details

- Vendor name
- Contact
- Service
- Assigned event
- Total amount
- Paid amount
- Remaining amount
- Payment due date
- Notes
- Documents

## Vendor Access

A vendor may receive an invitation to join the wedding workspace.

Their access must be restricted to relevant functionality.

---

# 21. Organizer / Wedding Planner Dashboard

This is an important part of the eventual SaaS strategy.

## Organizer Focus

The organizer dashboard should emphasize:

- Execution
- Deadlines
- Events
- Vendor coordination
- Tasks
- Issues
- Guests
- Expenses

## Organizer Dashboard

```text
Wedding Overview

Upcoming Events
Pending Tasks
Overdue Tasks
Vendor Status
Guest Count
RSVP
Pending Payments
Open Issues
```

The organizer is effectively part of the wedding team.

V1 should keep the account model simple rather than creating a separate complex multi-client planner platform.

---

# 22. Issue Reporting

Anyone with suitable permissions should be able to report a wedding problem.

## Issue Fields

- Title
- Description
- Reporter
- Assigned person
- Event
- Vendor
- Priority
- Status
- Created time
- Comments

## Status

```text
OPEN
IN PROGRESS
RESOLVED
```

Example:

```text
Problem:
Decorator has not arrived.

Event:
Sangeet

Assigned to:
Wedding Organizer

Status:
OPEN
```

---

# 23. Photo Gallery

The gallery is an important post-event experience.

## Gallery Structure

```text
Wedding
│
├── Haldi
├── Mehendi
├── Sangeet
├── Wedding
└── Reception
```

## Upload Permissions

Only:

- Admin
- Photographer

can upload photos.

## Guests

Guests can:

- View photos
- Browse by event
- Download photos

No photo approval workflow is required.

## Design Principle

The gallery should be simple and fast.

The product should avoid face recognition because the user explicitly wants photos organized by event rather than face.

---

# 24. Live Streaming

Make My Marriage should provide a livestream experience to remote guests.

## V1 Approach

The application should use an external streaming provider rather than building its own video infrastructure.

The stream should still appear as part of the Make My Marriage experience.

Example:

```text
Wedding
   ↓
Live Stream
   ↓
Embedded Video Player
```

## Requirements

- Add livestream
- Associate livestream with an event
- Public visibility
- Live status
- Embedded player
- Stream information on wedding page

The livestream should be public.

---

# 25. Activity History / Audit Trail

Because multiple people can manage a wedding, the product should record important changes.

Example:

```text
10:32 AM
Rahul added 5 guests

10:45 AM
Priya changed Sangeet time

11:05 AM
Anish completed Photographer task
```

The system should capture important create/update/delete actions.

This provides accountability and helps family members understand what changed.

---

# 26. Search

A wedding with 2,000 guests will require efficient search.

A global search can eventually search:

- Guests
- Members
- Events
- Tasks
- Vendors
- Expenses

Example:

```text
Search: Rahul

Guest → Rahul Sharma
Task → Rahul assigned
Vendor → Rahul Photography
```

Search should be designed into the architecture from the beginning, even if V1 begins with simple database-backed search.

---

# 27. Reports

V1 should provide basic reports, not a complicated analytics system.

## Guest Report

- Total guests
- Confirmed
- Declined
- Pending

## Task Report

- Completed
- Pending
- Overdue

## Expense Report

- Total budget
- Total spent
- Remaining
- Paid
- Pending

## Wedding Overview

A simple summary of overall wedding status.

---

# 28. Guest Experience

The guest should have a very different interface from the family/admin dashboard.

The experience should be:

```text
Invitation
   ↓
View Wedding
   ↓
See Events
   ↓
RSVP
   ↓
   Review Event Details
   ↓
Watch Livestream
   ↓
View Photos
```

The guest should not feel like they are entering a complex SaaS application.

---

# 29. Family/Admin Experience

The family experience is the primary application dashboard.

Main navigation:

```text
Dashboard
Events
Timeline
Tasks
Guests
RSVP
Expenses
Vendors
Invitation
Gallery
Live Stream
Issues
Notifications
Members
Settings
```

---

# 30. Role & Permission Model

A simplified model:

| Capability | Owner | Family Admin | Family Member | Organizer | Finance | Photographer | Vendor | Guest |
|---|---|---|---|---|---|---|---|---|
| Wedding Settings | ✅ | Limited | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Events | ✅ | ✅ | Assigned | ✅ | Limited | View | Assigned | View |
| Tasks | ✅ | ✅ | Assigned | ✅ | Limited | Limited | Assigned | ❌ |
| Guests | ✅ | ✅ | Assigned | ✅ | ❌ | ❌ | ❌ | ❌ |
| RSVP | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Own |
| Expenses | ✅ | Authorized | ❌ | Authorized | ✅ | ❌ | Limited | ❌ |
| Vendors | ✅ | ✅ | Assigned | ✅ | Limited | Own | Own | ❌ |
| Gallery Upload | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Gallery View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Livestream | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | View |
| Issues | ✅ | ✅ | ✅ | ✅ | Relevant | Relevant | Relevant | Limited |
| Members | ✅ | Authorized | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

The actual permission matrix should be implemented as capabilities rather than hard-coded screen access.

---

# 31. Data Model — High-Level

The main entities are expected to be:

```text
User
Wedding
WeddingMember
Role
Permission

Event
EventTimeline

Task
TaskComment

Guest
GuestFamily
RSVP

Invitation
InvitationRecipient

Expense
Payment

Vendor
VendorDocument

Notification
Reminder

Gallery
Photo
PhotoAlbum

LiveStream

Issue
IssueComment

ActivityLog
```

This model should remain modular so new wedding functionality can be added without redesigning the entire system.

---

# 32. Main User Journey — Couple

```text
Sign Up
   ↓
Create Wedding
   ↓
Add Wedding Information
   ↓
Create Events
   ↓
Invite Family Members
   ↓
Add Guests
   ↓
Create Invitation
   ↓
Send Invitations
   ↓
Track RSVP
   ↓
Create Tasks
   ↓
Assign Tasks
   ↓
Add Vendors
   ↓
Track Expenses
   ↓
Manage Wedding
   ↓
Wedding Events
   ↓
Live Stream + Gallery
```

---

# 33. Main User Journey — Guest

```text
Receive Invitation
       ↓
Open Personalized Link
       ↓
View Wedding
       ↓
View Events
       ↓
RSVP
       ↓
       Review Event Details
       ↓
Attend / Watch Livestream
       ↓
View Wedding Photos
```

---

# 34. Main User Journey — Organizer

```text
Join Wedding
       ↓
Open Organizer Dashboard
       ↓
Review Timeline
       ↓
Review Tasks
       ↓
Coordinate Vendors
       ↓
Track Open Issues
       ↓
Monitor Wedding Preparation
       ↓
Support Events
```

---

# 35. Wedding Lifecycle

The system lifecycle should be:

```text
Wedding Created
      ↓
Planning
      ↓
Invitations Sent
      ↓
RSVP Collection
      ↓
Final Preparation
      ↓
Wedding Events
      ↓
Photo / Livestream
      ↓
Post-Wedding
```

There is **no automatic deletion** after the wedding.

Wedding information, photos, guests, expenses, and other data remain available unless a future product decision changes the retention policy.

---

# 36. Free Product Model

Make My Marriage is completely free. V1 has no billing, subscription,
freemium tiers, or premium entitlements. Product limits and infrastructure
quotas are operational controls, not paid-plan enforcement.

---

# 37. SaaS Direction

The long-term product should support a wedding planner ecosystem without making V1 complicated.

The future direction can become:

```text
Couple
   ↓
Wedding Workspace
   ↓
Wedding Planner
   ↓
Vendors
   ↓
Guests
```

Later, professional wedding planners may become an important customer segment.

Potential future capabilities:

- Planner accounts
- Multiple client wedding management
- Planner-specific dashboards
- Team management
- Vendor network
- Wedding templates
- Planner analytics

These are intentionally future scope.

---

# 38. Non-Functional Requirements

## Performance

The system should remain responsive for weddings with:

- Up to 2,000 guests
- Large numbers of tasks
- Multiple members
- Thousands of photos
- Multiple events

## Security

The platform must ensure:

- Authentication
- Authorization
- Secure password storage
- Secure sessions/tokens
- Role-based access
- Protected private wedding-management data
- Protected financial information
- Secure file access where required

## Reliability

Important wedding information must not be easily lost.

The platform should support:

- Database backups
- Error logging
- Audit history
- File storage reliability
- Recovery procedures

## Mobile Experience

The product should be responsive and work well on:

- Desktop
- Laptop
- Tablet
- Mobile

Mobile is especially important because wedding planning frequently happens from phones.

---

# 39. UX Principles

Make My Marriage should feel:

**Elegant + Simple + Warm + Fast**

It should not feel like enterprise project-management software.

The UI should use wedding-appropriate visual design while preserving usability.

### Important principles

1. One-click access to important information.
2. Minimal unnecessary forms.
3. Clear status indicators.
4. Mobile-friendly interactions.
5. Search must be easy.
6. Important wedding information should never be more than a few clicks away.
7. Guest experience must remain simple.

---

# 40. MVP Definition

The first production-ready version should focus on:

### Core

- Authentication
- Wedding creation
- Wedding members
- Roles and permissions
- Wedding dashboard

### Planning

- Events
- Timeline
- Tasks
- Expenses
- Vendors

### People

- Guest management
- Family grouping
- Duplicate detection
- RSVP

### Communication

- Digital invitation
- Personalized invitation links
- Notifications
- Reminders
- WhatsApp-ready architecture

### Wedding Experience

- Photo galleries
- Live stream
- Public wedding page
- Guest experience

### Operations

- Organizer dashboard
- Issue reporting
- Activity history
- Basic reports

---

# 41. Phase 2 / Future Features

These should not block the initial release:

- AI Wedding Assistant
- AI-generated wedding checklist
- AI wedding planning recommendations
- Custom invitation builder
- Custom domain
- Advanced analytics
- Advanced WhatsApp automation
- Vendor marketplace
- Accommodation management
- Transportation management
- Seating planner
- Guest QR check-in
- Multi-wedding planner accounts
- Advanced planner SaaS
- Better livestream infrastructure
- Advanced photo discovery

---

# 42. Key Product Metrics

The initial product should measure:

### Wedding Creation

- Number of weddings created
- Setup completion rate

### Engagement

- Weekly active wedding members
- Tasks created/completed
- Events created
- Guests added

### Invitations

- Invitations sent
- Invitation opened
- RSVP conversion rate

### Planning

- Tasks completed
- Overdue tasks
- Expenses recorded
- Vendors added

### Wedding Experience

- Livestream viewers
- Gallery views
- Photo downloads

### Product Health

- Wedding setup completion
- Continued family collaboration
- Successful RSVP collection
- Successful photo uploads and downloads

---

# 43. Product Success Definition

Make My Marriage is successful when a family can manage a real Indian wedding without needing several disconnected tools.

A successful wedding workspace should allow a user to answer:

> How many guests are coming?

> Who has RSVP'd?

> What events are happening?

> What tasks are pending?

> Who is responsible?

> How much have we spent?

> Which vendors are involved?

> What needs attention?

> Where is the invitation?

> Where can relatives watch the wedding?

> Where are the wedding photos?

All of these answers should exist in one system.

---

# 44. Product Principle

The most important product principle is:

> **Make the complicated Indian wedding feel simple.**

We should not try to model every possible wedding activity.

Instead, we should build a flexible system around the things that almost every wedding needs:

**People + Events + Tasks + Money + Vendors + Invitations + RSVP + Communication + Memories**

---

# 45. Final Product Structure

The final product can be represented as:

```text
                    MAKE MY MARRIAGE
                           │
                           ▼
                   WEDDING WORKSPACE
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
      PEOPLE             EVENTS            PLANNING
        │                  │                  │
   Family Members      Timeline            Tasks
   Guests              Venues              Expenses
   Vendors             Activities           Vendors
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                    COMMUNICATION
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
           Invitation    RSVP      Reminders
                │
                ▼
                    WEDDING EXPERIENCE
                ┌──────────┼──────────┐
                ▼          ▼          ▼
             Gallery    Livestream   Events
                │
                ▼
                     MEMORY PLATFORM
```

# 46. Final V1 Feature List

For clarity, the agreed product scope is:

1. Authentication
2. Wedding workspace
3. Multiple wedding members
4. Role-based permissions
5. Custom roles
6. Wedding setup
7. Multiple wedding events
8. Event timelines
9. Main wedding dashboard
10. Task planner
11. Expense tracker
12. Vendor management
13. Guest management
14. Family grouping
15. Duplicate guest prevention
16. Digital wedding invitation
17. Personalized invitation links
18. Mandatory RSVP
19. Member in-app reminders; guest reminders deferred to Phase 2
20. Event reminders
21. Payment reminders
22. Organizer dashboard
23. Issue reporting
24. Activity/audit history
25. Search
26. Basic reports
27. Event-based photo gallery
28. Photo upload by admin/photographer
29. Photo downloading
30. Public livestream
31. Guest-facing wedding experience
32. English/Hindi support
33. Mobile-responsive experience
34. Free product; no billing or subscription foundation
35. Wedding data remains available after the wedding; no automatic deletion

---

# 47. Product Statement

**Make My Marriage is a collaborative wedding planning and management platform that gives Indian couples and their families one place to organize their wedding, manage guests and vendors, track tasks and expenses, send invitations, collect RSVPs, communicate with guests, livestream ceremonies, and preserve wedding memories.**

The product should make wedding planning **less chaotic, more collaborative, and easier to understand**.
