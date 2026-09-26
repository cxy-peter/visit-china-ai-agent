# Public DeepSeek travel chat and optional private sessions

## Product behaviour

The hosted `/api/chat` endpoint now defaults to public travel chat, as requested. Visitors open the page and send a question without entering an administrator password, experience code or API key. The frontend hides the old credential form in this mode and shows whether the server has a model key. Opening the page alone does not call the model. A visible model-processing setting lets visitors pause use; their explicit opt-out survives reload.

The API key remains server-only. Operations write and release permissions remain authenticated. Model consent, input limits, origin checks and the existing per-instance hourly throttle remain in place. The hourly throttle is not a durable global spend cap; provider usage should still be monitored.

Set `TRAVEL_CHAT_PUBLIC=0` in the target Vercel environment and redeploy to restore private chat access. No production environment change is needed to enable the new default.


## Reproduced failure

The hosted page runs the new login UI. Entering `demo2026` returns `LOGIN_FAILED` from Operations, before any DeepSeek request. The local demo initializer introduced in PR #5 deliberately does not overwrite hosted `OPS_USERS_JSON`. A local default password is therefore not evidence of the production password.

Production authentication uses the salted scrypt hash in `OPS_USERS_JSON.admin`, with `OPS_SESSION_SECRET` signing the cookie. `ADMIN_PASSWORD` belongs to the legacy local login and does not change this account. Redeploying unchanged credentials cannot fix a password mismatch.

## Code changes

- Explain `LOGIN_FAILED` in Chinese and distinguish it from an API key or experience-code error.
- Let an authenticated administrator establish a chat session using the existing Operations signing secret when no legacy `TRAVEL_CHAT_ACCESS_CODE` is configured. Derive a purpose-specific chat key; never accept the Operations signature as a chat signature.
- Preserve old chat signatures when a legacy experience code is configured. Keep trial-code expiry, revocation and usage checks, origin checks, roles and model consent.
- Verify the resulting session with a separate GET before the UI claims connection success. A rejected cookie keeps the dialog open with an actionable message.
- Do not add a public default-password bypass, provision production accounts implicitly, expose secrets, or change prompts, tools, budgets, city knowledge, voice behaviour or release approvals.

## Production configuration repair

Use the existing Operations administrator password, or explicitly reset the desired password in the project configuration. For a reset, preserve every other account in `OPS_USERS_JSON`; replace only the admin salt and its `scryptSync(password, salt, 32).toString('hex')` hash. Preserve `OPS_SESSION_SECRET` unless a deliberate session rotation is required. Apply to the intended environment and redeploy the latest reviewed commit. Never commit the environment variable values or upload a private account file to GitHub.

The existing public `/api/admin-login-info` remains status-only. It never returns a hosted password.

## Verification

`node --test v5/cloud-admin-login.test.js` covers configured-password login, rejection of an unconfigured demo password, explicitly configured demo-password login, signed-cookie persistence, a model HTTP call after login, anonymous/reviewer denial, origin and consent checks, trial revocation, signature separation, fail-closed missing configuration, legacy-cookie compatibility and logout.

`python v5/cloud-admin-browser-test.py` drives real Operations and cloud-chat HTTP handlers in Chromium. It checks wrong-password feedback, login, reload, logout, and loss of the Set-Cookie header. The provider is a test double; this is not a production or paid-model acceptance result.

Production acceptance is separate: open a fresh browser without logging in, submit one travel question, and verify the answer reports DeepSeek mode. In optional private mode, also verify configured-password login and session persistence. A green build alone does not verify provider credentials or billing.

`python v5/public-chat-browser-test.py` additionally checks automatic readiness, absence of credential requests, a generated answer from the provider test double, authenticated Operations, and persistent model opt-out. Real production DeepSeek acceptance remains separate.
