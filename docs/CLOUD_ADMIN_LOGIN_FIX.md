# Shared Operations and DeepSeek login

Hosted chat requires login by default (`TRAVEL_CHAT_PUBLIC=0`). The login panel can display six explicitly provisioned demo accounts: admin / demo2026 and reviewer1–5 / review2026-1–5. Clicking an account fills the form; submitting authenticates against real server-side scrypt hashes. Unknown accounts and wrong passwords fail. These credentials are intentionally public demonstration credentials, not private production secrets.

## Root cause and repair

`LOGIN_FAILED` happened before a model request: the production Operations password did not match the local-only default. An additional dependency on a legacy experience code prevented admin-to-chat access when that code was absent. Chat now derives a purpose-separated signing key from the existing Operations session secret when necessary. Existing experience-code signatures, trial expiry/revocation, consent, origin checks, input constraints, throttling and original prompts remain unchanged.

Both admin and reviewer roles can establish a DeepSeek chat session. Reviewer access does not grant Operations admin actions. Five reviewer identities and revision-specific voting remain unchanged. Switching among public demo identities demonstrates the workflow, not independent review by five different people.

## Explicit deployment configuration

Provision the six public demonstration accounts into `OPS_USERS_JSON` using `v5/demo-accounts.js:provision()`, retain a valid `OPS_SESSION_SECRET`, set `OPS_PUBLIC_DEMO_ACCOUNTS=1` and `TRAVEL_CHAT_PUBLIC=0`, then redeploy. `DEEPSEEK_API_KEY` remains server-only. No automatic password fallback is added. The account-info endpoint only advertises known public demo passwords whose current hashes and roles actually match; it never returns custom passwords, hashes or signing keys. Disable the demo flag and provision private passwords for a private installation.

Public chat is still an optional, explicitly enabled setting (`TRAVEL_CHAT_PUBLIC=1`), with separate regression coverage. It is not the deployed default. The frontend verifies the signed session with a separate GET before reporting successful connection; a rejected cookie keeps the dialog open.

## Verification

- `cloud-admin-login.test.js`: real HTTP/cookie boundaries, model-provider boundary, role and consent checks, legacy and trial sessions, forgery rejection, public/private configuration.
- `demo-accounts.test.js`: all six advertised credentials match actual hashes, wrong passwords fail, custom configurations are not exposed or overwritten.
- `cloud-admin-browser-test.py`: private login, reload, logout, rejected cookies.
- `demo-accounts-browser-test.py`: six visible account choices, wrong-password feedback, generated response after login, all five reviewers connect chat while admin-only mutations are denied.
- `public-chat-browser-test.py`: optional public mode and persistent opt-out.

Browser fixtures use a mock provider. Real production model calls are verified separately after deployment. Build success alone does not establish successful DeepSeek inference.
