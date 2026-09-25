# V5.7 — operations, source review and needs-first travel assistance

The production site keeps the original conversation and source-library layout, and adds a durable Operations dashboard. No external booking or payment is performed.

## Operating the product

1. Open **Operations**, sign in with the private admin account, and choose **数据概览**. The default is live anonymous events. Switch to **模拟演示** to explore a clearly separate, generated dataset of 120 conversations.
2. **资料库管理** shows source summaries, editorial dates and page-check results. **立即检查原文** runs a manual refresh. Source Library also exposes **添加资料** and **手动更新 / 管理**.
3. Visitors can submit a title, original HTTPS link, publisher, city, searchable topics and Chinese/English summaries. A submitted record is not available to the assistant until publication.
4. In **审核队列**, independent reviewer accounts check the original and vote on the exact content hash. Five distinct approvals publish; authors cannot self-approve. Rejection blocks publication, editing clears votes, stale revisions cannot overwrite new ones, and the admin can roll back the current release. Account uniqueness does not establish five natural persons.
5. **流程与评测** runs ten deterministic synthetic scenarios. An optional, explicitly selected real DeepSeek check uses API credits. Admins can propose speaking style/length and request a model-generated candidate. Candidates need regression checks and five independent approvals before publication. New chats use the current published workflow; ongoing cloud conversations retain their published version where available.

## Source checking and evidence boundaries

A Vercel daily cron checks whether the stored 72-hour interval is due; it refreshes then, without resetting at calendar-month boundaries. Actual execution follows the daily schedule and Hobby timing window, so this is not an exact-to-the-minute 72-hour guarantee. Manual refresh restarts the due interval and has a one-minute cooldown. The endpoint requires `CRON_SECRET`; manual refresh requires admin login.

Automatic checking covers up to 30 active curated/approved answer summaries, **not all 1,114 historical index entries**. Initial ten summaries include new Shanghai taxi, Shanghai–Hangzhou rail and Shanghai metro references. Approved connectors use HTTPS domain allowlists, robots rules, crawl spacing, same-host redirects, byte limits and timeouts. Other domains need a reviewed connector or manual editorial checking. Failed checks are visible, and never relabeled as successful fact checks.

Page hashes detect changes; they cannot determine semantic correctness. Changes hold the corresponding summary from answers and create a review proposal. An editor must review/edit it before voting. Five reviewers approve the exact replacement. Editorial validity is separate from successful fetching: a fetch does not extend the editorial review window. Changed/expired route and tariff summaries also pause their browser factual tools. Historical map links remain explicitly dated.

## Assistant workflow and DeepSeek

Input/voice gate → current need and context → relevant approved summaries → deterministic route/fare tools → DeepSeek for general contextual wording → schema/source/number checks → visible answer and relevant cards → anonymous events.

The server uses the same `assistant.js` and DeepSeek client as the earlier app. It retrieves the current approved cloud library before an answer. Exact taxi calculations, route guidance and variable-ticket-price caveats come from bounded tools. They do not need a paid generation. Missing airport terminal/distance prompts for those fields; short T1/T2 and kilometre follow-ups retain the relevant taxi context. Place names alone never establish driving distance. The opening asks for a specific need rather than immediately asking for flight and hotel status.

This is rule-based orchestration and retrieval with a model wording/candidate step. It is **not native autonomous tool execution, weight fine-tuning, a proven hallucination-free system, or a booking agent**. The synthetic dataset checks selected behaviors, not real microphone quality, real travelers or independent model accuracy. DeepSeek calls retain private access/consent, cancellation, token limits and the earlier secondary per-instance chat throttle. That is not an account-wide budget cap.

Shanghai–Hangzhou examples distinguish Shanghai Hongqiao / Hangzhou East and require date/class confirmation. No historical tariff table becomes today's ticket price. Taxi estimates are ordinary daytime off-peak metered fares; waiting, night/peak adjustments and unentered extras are outside the base estimate. Ctrip car rental and Trip.com airport-transfer links are provider query entrances, not live offers or quotations. Metro diagrams show Chinese and English endpoints simultaneously; the full network image is marked as its 2024 edition.

## Metrics

- Only event ID, anonymous conversation ID, time, category and card ID are collected; conversation text, credentials and audio are not analytics fields.
- The funnel is ordered within 30 minutes: chat start → user need → corresponding card seen → matching platform link clicked. No purchase/payment event is inferred.
- Visibility requires at least half the card on screen; an explicit click also establishes visibility. CTR deduplicates conversation/card pairs and requires a matching exposure before the click within 30 minutes.
- Time filters are 7 / 30 days; product filters include train, flight, hotel, car and restaurant. Browser blocking and forgery remain limitations. Stored events are capped at 30 days / latest 8,000; this is a low-volume prototype, not an analytics warehouse.
- Synthetic metrics are generated separately on read and never appended to live events. Development and release QA actions on a production site count as actual browser events, not organic users.

## Deployment and credentials

Existing Vercel project and GitHub branch are retained. Private Vercel Blob JSON storage uses uncached identity-encoded private reads (avoiding compressed weak ETags) and strong ETag conditional writes with retries, so concurrent reviewers cannot silently overwrite each other's votes. Local development uses a transactional SQLite adapter. Blob is used within the existing Hobby allowance; no paid-plan upgrade or LiveKit Cloud subscription was made. Hobby usage limits still apply. DeepSeek API usage is billed separately by the provider.

Production variables: `DEEPSEEK_API_KEY`, `TRAVEL_CHAT_ACCESS_CODE`, linked `BLOB_READ_WRITE_TOKEN` (or supported OIDC `BLOB_STORE_ID`), `OPS_USERS_JSON`, `OPS_SESSION_SECRET`, `CRON_SECRET`. Only salted scrypt password hashes go into `OPS_USERS_JSON`. Passwords and signing secrets are not in this repository or the public browser bundle. The private delivery file contains admin and reviewer credentials. Rotate those outside Git. Do not copy production data/credentials into development or public evidence.

`CLOUD_OPERATIONS=1` on the local Node server exercises the cloud-compatible frontend and `/api/chat`, `/api/ops`, `/api/source-refresh`. Without it, the original Node/SSO/LiveKit operations backend remains available. No framework migration removes those earlier patches.

## Open-source references and primary sources

The implementation borrows product patterns, not source code or hosted paid services:

- [PostHog](https://github.com/PostHog/posthog): event definitions, ordered funnels and deduplication; [funnel documentation](https://posthog.com/docs/product-analytics/funnels).
- [Langfuse](https://github.com/langfuse/langfuse): versioned prompts, datasets and evaluations; [code evaluators](https://langfuse.com/docs/evaluation/evaluation-methods/code-evaluators).
- [Metabase](https://github.com/metabase/metabase): filterable business metrics and dashboard layout.
- [DeepSeek function-calling guide](https://api-docs.deepseek.com/guides/tool_calls/): reference for a future native tool-call loop. The current bounded tools are selected by application logic; model responses cannot execute arbitrary actions.
- [Shanghai taxi tariff explanation](https://jtw.sh.gov.cn/zsk/20220119/df77a6e1817b4a269464fe575c572ebb.html), [12306 dated Shanghai–Hangzhou notice](https://mobile.12306.cn/mormhweb/zxdt/202405/t20240502_41893.html), [Shanghai official 2024 metro map page](https://english.shanghai.gov.cn/en-Latest-WhatsNew/20240924/b625d488216241f78f743cd87a40df0c.html).
- [Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Blob allowance and billing](https://vercel.com/docs/vercel-blob/usage-and-pricing), [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

The existing `vosk-browser` dependency retains its reported transitive `uuid` moderate advisory; this release does not call uuid v3/v5/v6 buffer APIs. No compatible upstream fix was reported by npm audit. The separate voice runtime and synthetic microphone fixtures remain part of CI; no human microphone acceptance is claimed.
