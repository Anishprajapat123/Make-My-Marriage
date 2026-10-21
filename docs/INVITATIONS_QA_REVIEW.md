# Guest invitations and RSVP — verification

Verified locally on 21 October 2026. This is an implemented development slice,
not a deployment or production load certification.

## Results

- Lint and TypeScript checks pass; 73 existing tests pass.
- Production build passes.
- Isolated live Playwright journey passes with temporary verified accounts and two
  weddings. SES is disabled; no guest emails are sent.
- Family Member reads Events but cannot create events. Restricted create routes
  explain the permission requirement instead of returning an unexplained 404.
- Tested published-only public schedule, private-field exclusion, named companion
  creation, duplicate confirmation, changing attendance, individual response counts,
  idempotent retries, stale requests, cross-wedding isolation, and party isolation.
- Tested revoke/replace, archive/restore, unpublish/republish, unavailable links,
  and per-token write throttling. Cleanup assertions confirm no QA records remain.
- Desktop/mobile screenshots and overflow assertions cover the public invitation,
  host overview, restricted Events, and unavailable invitation states.

## Boundaries

Guest links are copy/share only; collaborator SES invitations remain separate.
Photo customization and guest email distribution are not implemented. Production
WAF/trusted-edge rate limits, accessibility certification, and load testing remain
before release. A dev server already running before these schema changes should be
restarted to refresh cached Mongoose models.

The first live run stopped at an expected-status assertion: the foreign wedding
had no invitation configuration, so it correctly returned configuration-required
409 before reaching guest lookup. The fixture now saves that wedding's config and
verifies the foreign guest lookup returns 404. No application change was required.
