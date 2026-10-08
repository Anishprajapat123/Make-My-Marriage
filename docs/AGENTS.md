# Make My Marriage Development Rules

1. Read the PRD, System Design, Database Design, and API Design before implementing major functionality.

2. The architecture is a modular monolith.

3. Do not introduce microservices unless explicitly approved.

4. One wedding represents one tenant.

5. Every tenant-owned database query must be scoped to tenantId.

6. Never trust tenantId supplied directly by the client.

7. Tenant context must come from the authenticated user/session or controlled guest token.

8. Guests do not have application accounts.

9. Guests access wedding information through secure invitation links.

10. Use TypeScript.

11. Use MongoDB Atlas with Mongoose.

12. Store photos/documents in S3, not MongoDB.

13. Store file metadata/references in MongoDB.

14. Keep business logic inside domain modules.

15. Keep route handlers thin.

16. Do not put business logic directly inside page components.

17. Validate external/user input.

18. Never expose secrets to client components.

19. Do not add dependencies without a concrete reason.

20. Do not modify architecture without discussing the impact.

21. Do not implement features outside the approved product scope.

22. Prefer simple solutions over premature infrastructure.

23. Do not introduce billing/subscription functionality.

24. Do not implement automatic post-wedding deletion.

25. Before major implementation work, explain the approach and affected modules.