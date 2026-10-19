# Tasks design refinement prompt

Paste into the existing Make My Marriage Platform project:

```text
Refine Tasks & Operations Planner using the existing Editorial Sanctuary theme
and the application's current workspace navigation. Generate desktop and mobile
screens with tablet adaptation.

Create:
1. Tasks list: populated, empty, loading, fetch error/retry, no search results.
   Filters: event, status, priority, assignee, overdue, and My Tasks.
2. Create/edit task form: title, optional description, optional event,
   one or more active wedding-member assignees, optional due date/time in the
   wedding timezone, priority, and status. Include validation/saving/error states.
3. Task details with a bounded checklist and a separate comments section.
4. Assigned family-member view: only their tasks; allow status and checklist
   updates. Hide title, event, assignee, priority, due-date edits and deletion.
   Planners manage all tasks. Include permission denied and stale-edit states.

Use statuses To do, In progress, Waiting, Completed.
Use priorities Low, Medium, High. Overdue is derived from the deadline, not a status.
Support tasks with no assignee, event, or deadline. Show actual data-driven counts.
Use one consistent create/edit flow across empty and populated lists.
Keep optional fields collapsible where this reduces mobile scrolling.

Remove airport/transport coordination, seating planning, SaaS/billing content,
AI/automated checklist claims, guest-site publishing, and vendor-dependent stats.
Do not add a calendar or Kanban board in the first slice; focus on the task list,
form, and details. Manual templates can be a later step.
Preserve readable typography, accessible labels, minimum 44px touch targets,
keyboard-friendly dialogs, and no horizontal overflow.
Clearly name all screens. Keep simulation controls separate from production UI.
```
