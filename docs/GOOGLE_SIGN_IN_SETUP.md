# Google sign-in for the zero-budget demo

Status: OAuth client credentials are configured privately in Vercel Production.
The production deployment is READY and Google authorization start was verified;
it reaches Google's sign-in screen with the correct callback and basic scopes.
Full interactive callback/account acceptance is still pending user sign-in.
Use direct Google OAuth with Auth.js, not paid Google
Identity Platform, Firebase upgrades, SMS, or other billable APIs.

## One-time owner setup

1. Open https://console.cloud.google.com/ and create/select a project named
   Make My Marriage. Skip free-trial/billing activation. A billing account is not
   needed for this basic OAuth client.
2. Open Google Auth Platform. Configure Branding with the app name, your support
   email and developer contact. Complete any Google-required ownership/policy
   verification honestly; do not claim ownership of vercel.app itself.
3. Set the audience External so people outside your organization can sign in.
   Use only openid, email and profile identity scopes. Do not request Gmail,
   Drive, contacts or calendar access. Review Google's publishing requirements for
   public access; do not rely on manually approving every visitor as a test user.
4. Under Clients, create an OAuth client with application type Web application.
5. Production authorized JavaScript origin:

   https://make-my-marriage-sepia.vercel.app

6. Production authorized redirect URI (exact):

   https://make-my-marriage-sepia.vercel.app/api/auth/callback/google

7. For local development add origin http://localhost:3000 and redirect URI
   http://localhost:3000/api/auth/callback/google. A separate local client is also
   fine. Do not use a browser extension or desktop client type.
8. Store the issued values in ignored .env.local:

   ```env
   AUTH_GOOGLE_ID=your_client_id
   AUTH_GOOGLE_SECRET=your_client_secret
   EMAIL_PROVIDER=disabled
   ```

9. Tell the agent credentials are saved, without pasting them into chat. The
   deployment needs these two values privately in Vercel Production and a rebuild.

## User flow and boundaries

- New user selects Continue with Google and authorizes basic identity access.
  The server validates the OAuth response and requires Google's verified-email
  claim. The user creates their wedding or accepts an invitation explicitly.
- Existing local accounts keep password sign-in. A matching email is not permission
  to silently link providers or take over an existing account. Google sign-in for
  an already-existing local email remains blocked until secure linking is designed.
- Institution/workspace administrators can restrict Google OAuth access. Do not
  promise every university/work address can use this flow.
- Guest RSVP remains account-free. Google sign-in does not send invitation emails;
  host-issued collaborator links can be shared manually.
- Email/password signup and password reset show unavailable states while email is
  disabled. Their APIs return global 503 before account lookup/creation, without
  revealing account existence. No paid email fallback or fake verification.
- No Google Cloud billing setup, paid APIs or new dependencies are needed for the
  intended basic sign-in integration. Existing hosting/database limits still apply.

## Verify after credentials are configured

Confirm OAuth start/callback, Google account choice, new-account onboarding,
existing Google account sign-in, collaborator continuation with matching email,
logout, cancellation/errors and existing local-account protection. User completes
Google credential entry and any required consent/verification steps. Do not mark
Google sign-in complete before an actual successful hosted journey.

References: [Google web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[Google sign-in setup](https://codelabs.developers.google.com/codelabs/sign-in-with-google-button).
