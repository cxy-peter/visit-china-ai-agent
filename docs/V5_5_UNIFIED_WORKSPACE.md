# V5.5 · Conversation and official sources in one workspace

The source-library navigation now opens inside the current app. It retains the V4 search, city filters, card list, publisher/date metadata and original-source detail layout. The original V4 workspace remains available at `/v4/`, including its legacy research view. No React/framework migration or third-party source-code copying was needed.

## Shared interaction

- Search 1,114 official index records plus curated summaries (1,120 distinct URLs after deduplication). Chinese summary text is searchable. Index-only entries remain explicitly unreviewed; seven curated summaries are not a claim that the whole corpus has been verified.
- Attach up to three sources to the next text or local/browser voice turn. A source is reference context, not a traveler fact: attaching a Shanghai page does not change a Boston trip. Source selection carries across turns until removed; new chat/reset clears it.
- Each historical turn retains its references. Open any reference in the same library, then return to the same conversation. The opening request, preferences, example cards and current trip remain intact.
- A shared model status/consent dialog is accessible from both views. The same call remains active while browsing; its hangup control remains available at the top.

## One model configuration, one conversation answer path

The V5 server already instantiated the V4 model client. `/api/v5/assist` now uses that same DeepSeek client for conversational answers, regardless of whether the latest text was typed or locally transcribed. It receives bounded recent history, current trip facts, preferences and applicable saved source summaries. Replies and source IDs are stored on the matching turn. Browser/local voice playback can read that answer and return to listening. The optional LiveKit worker remains a separate media transport; the existing packet/refinement safeguards remain in place.

Existing quote-backed fact extraction remains available through “补充识别行程需求”. It still requires explicit adoption. Model prose cannot update trip facts, perform bookings, modify the workflow, or approve itself.

The shared route preserves consent, authenticated access, hourly request limits, low-power/offline fallbacks, abort handling and revision/session checks. Repeating an answered revision reuses its stored answer. Late replies are rejected after edits/reset/end or session rotation. Sources disabled by the original library are excluded. Known foreign destinations cannot automatically borrow China source references. Index-only, expired or incompatible selected sources produce an explicit evidence gap. Monetary questions use fixed guidance/calculators rather than generated fee rules.

Answer checks cover schema, known citation IDs, numeric tokens supported by the cited summaries/user input, links, common secret requests and fabricated booking-completion patterns. These checks are **not an independent semantic fact checker**. Summaries remain saved editorial material, not newly fetched pages. The existing Field guides action still performs the separate live-source check. Uncited conversational suggestions are not official policy.

## Public-site boundary

The Vercel deployment is static. It includes unified library/search, free Vosk voice, saved-reference displays and deterministic trip handling. At verification time no Vercel environment variables were configured. Real DeepSeek responses require a persistent Node backend plus a server-side key, authenticated access and user consent. The UI says when those are absent. No paid API request was made for this release; provider responses in tests are test doubles.

For local use: `npm ci`, `npm run build`, `npm start`. Configure `DEEPSEEK_API_KEY` in the local environment or use the authenticated administrator model settings. Do not put keys into browser storage or commit them. Vosk recognition remains free and local; DeepSeek API usage and any externally hosted infrastructure are separate costs.

## Open-source references reviewed on 2026-09-24/25

| Project | Useful pattern for this product | Boundaries |
| --- | --- | --- |
| [Pipecat](https://github.com/pipecat-ai/pipecat), BSD-2-Clause | Voice input, common conversation processing, tool results and speech output as separate components; DeepSeek adapter and structured flows are available. | Python/media integration would be a future backend change. An open-source framework does not make model APIs or hosting free. |
| [Pipecat UI](https://github.com/pipecat-ai/pipecat-ui), BSD-2-Clause | Transcript, voice controls and session state presented together. | A recent React/shadcn rebuild, not a reason to replace this working plain-JS UI. No component code was copied. |
| [Chainlit](https://github.com/Chainlit/chainlit), Apache-2.0; [element display documentation](https://docs.chainlit.io/concepts/element) | Put references below each answer and open supporting material in a side panel. | Community-maintained project. Adopting the whole Python/React application would require migration; this change uses the interaction pattern only. |
| [Google Travel Concierge](https://github.com/google/adk-recipes/tree/main/python/agents/travel-concierge), Apache-2.0 | Planning, pre-trip checks, in-trip help and post-trip preferences use shared session state; flights/hotels/booking examples include mocked tools. | The repository formerly named `adk-samples` now redirects to `adk-recipes`. This sample depends on Google services for some functions and is not a free live booking backend. |

The immediate scenario fit is: choose a destination → compare clearly marked example transport/hotel cards → check official requirements → get local transport help → retain preferences only if requested. A later extension can add real inventory adapters while keeping official policy evidence separate from commercial availability.

## Verification

Run `npm test`, `npm run voice:check`, `npm run build`, then the four V5 browser scripts in CI. New focused checks cover shared-model authorization/caching, source provenance, foreign-city isolation, stale results, low-power suppression and disabled sources. New browser checks cover source search/details, same-tab return, per-turn references, consent, mock-model speech playback, call controls while browsing, memory/new-chat isolation and mobile layout.

Evidence is under `evidence/v5.5/`. Actual Vosk WASM decodes the synthetic English/Chinese fixtures; this is not a real-human microphone, accent or noise-quality acceptance test. Existing five-account review, reference fee calculators, redaction, turn conflict handling, current-call policy pinning and V4 compatibility continue through the existing regression suite.
