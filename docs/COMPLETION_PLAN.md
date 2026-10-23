# Remaining completion work — 22 October 2026

The user approved coordinated completion batches and Cloudinary Free demo photo
storage. This changes the earlier one-feature-at-a-time workflow and demo S3
requirement; existing privacy, tenancy, permission and zero-budget rules remain.

## Saved milestone

Issues first slice is committed locally on dev as 4d395e0. No push or new deployment
was performed in this step. Its live/security acceptance remains pending.

## Completion batches

1. Wedding settings/profile, explicit public-page publishing, and public wedding
   information based only on approved public content. Keep private notes/contact
   data out of public responses. Profile identity changes must not bypass verified
   email or silently link OAuth/password accounts.
2. Gallery albums, authorized photographer/admin uploads, verified Cloudinary
   completion, original/optimized/thumbnail records and responsive public browsing.
   Provider setup is required; unconfigured uploads must show an unavailable state.
3. External livestream configuration and public viewing, without hosting video or
   accepting arbitrary iframe HTML. Use approved providers and publication controls.
4. Remaining planning gaps: custom roles with owner/escalation protections, guest
   import preview/commit and export, permission-scoped search/reports, and activity
   views. Existing slice exclusions need explicit contract updates before expansion.
5. In-app reminder preferences and scheduling: choose a verified zero-cost execution
   approach before adding a job dependency. No guest reminders or WhatsApp in V1.
6. Whole-application review/acceptance, deployment configuration and documentation.
   Existing feature checks do not establish full production readiness.

Each batch needs implemented persistence, validation, access rules, responsive UI,
genuine error/empty states and explicit verification results before being complete.
No excluded accommodation, transport, seating, check-in, face recognition or billing.

## Cloudinary setup

Implementation checkpoint: provider connection verified as Free on 22 October 2026.
Local gallery/settings/public-page/livestream first slices are implemented. Live
browser/upload and access-control acceptance remains pending; remaining completion
batches are not complete. Profile changes cover display name/phone only.

1. Create a Cloudinary Free account without adding a payment method or enabling
   paid add-ons. Confirm the account actually shows Free.
2. Open Console Settings > API Keys. Store cloud name, API key and API secret in
   ignored .env.local as CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
   CLOUDINARY_API_SECRET. Do not paste secrets into chat or commit them.
3. Configuration alone does not implement uploads. Server signing, tenant-scoped
   object identifiers, size/type checks and completion verification are still work.
4. Configure production values privately only when the implementation is ready.

Cloudinary's Free allowance is shared by storage, transformations and bandwidth;
it is not a promise of unlimited photos or 5 GB for every wedding. Use conservative
application limits and fixed image variants. Provider soft limits and possible
account disablement require unavailable/error states; never upgrade automatically.

Sources checked 22 October 2026:

- [Cloudinary plans](https://cloudinary.com/documentation/billing_and_plans)
- [Free-plan limits](https://cloudinary.com/faq)
- [Account disablement](https://cloudinary.com/documentation/ts_why_is_my_account_disabled_and_how_can_i_recover_my_disabled_account)
- [Credentials location](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials)

These are completion scopes, not claims that the remaining modules are implemented.
