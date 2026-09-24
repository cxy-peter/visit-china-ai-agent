# Visit China AI V3 — conversation-led arrival support

## Delivery status

The complete V3 source is delivered as `Visit_China_AI_V3_Source.zip` in the project ChatGPT conversation. **The ordinary V3 application files have NOT yet been synchronized into this repository.** This handoff document is not a deployed application. The old V2 bootstrap failed its original SHA256 verification on part 8; do not remove checksum verification to make that workflow pass.

Source ZIP SHA256: `33ce9743a0082cf72e2188dd04d52221d4ac00362a0d74a44fb8bbeb392068f5`

Standalone HTML SHA256: `b4ede163528fb5e3fba602355af562f4db4bdae44c370c250677f64f3c825201`

## Implemented in the downloadable source

- Incremental text and clickable answers update the same trip state; negation, correction, undo and source identity are preserved.
- Optional DeepSeek structured extraction is asynchronous. Users can continue typing, old requests are cancelled, stale responses cannot overwrite current requirements, and model proposals need confirmation.
- Optional browser speech intake with explicit consent and editable transcript. Not a full-duplex phone call, human operator or guaranteed offline transcription.
- Separate critical-battery, weak-network and offline paths. No upselling or remote media during critical recovery.
- Official-source airport landmarks and opt-in photo links; no invented gate numbers or routes through restricted areas.
- Operations entry, browser-only demo role, local authenticated model settings, reported token usage and community-review demonstration.
- Default deterministic mode requires no key. No real OTA, charging inventory or external model call has been validated.

## Local and Codex handoff

Download the ZIP from the conversation, extract to a temporary directory, and read `docs/CODEX_HANDOFF_V3.md`, `PRODUCT_V3.md`, `METRICS_V3.md` and `DEPLOYMENT_V3.md`.

Node.js 22+:

```bash
npm ci
npm test
npm run evaluate
npm run build
npm start
```

Local address: `http://127.0.0.1:8787`; Operations: `/#operations`. Local demonstration credentials: `admin / demo2026`; replace the password before using anything other than synthetic data. Keys belong in server memory or `.env`, never in the browser bundle or Git.

Before publishing, clone this repository normally, inspect its current diff, copy the complete V3 source without overwriting `.git` or unrelated user changes, disable the failed legacy bootstrap workflows, rerun tests, then review and commit ordinary source files. No Vercel deployment or user-PC service has been performed by this handoff.

## Measured development checks

167 Node tests passed; 71 compiled-UI browser checks passed; no JavaScript runtime errors in those checks. Browser storage/network/voice use test substitutes; Node HTTP and authorization tests are separate. This is not a real microphone, real DeepSeek, browser-to-localhost end-to-end, live traveler, or Vercel-site acceptance result.
