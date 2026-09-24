# Visit China AI V4 · Evidence-led Arrival

**先确认需求，再查询官方依据，最后生成可执行的抵达节点。**

A personal conversation-first prototype with a real server-side DeepSeek adapter, bounded official-site retrieval, source provenance, and an operations console. Not an official airport, government or Trip.com service.

## Start locally

```bash
npm ci
npm test
npm start
# http://127.0.0.1:8787
```

Node.js 22+. Operations login: `admin / demo2026` (change `ADMIN_PASSWORD` before using anything beyond a local demonstration).

Add your own DeepSeek key in Operations, select `deepseek-flash`, save, then explicitly enable model processing in the conversation. The key stays in the server process, not browser storage or public code. Environment configuration is also available in `.env.example`.

**The adapter sends real API requests when configured; no real paid DeepSeek call or model-quality score is claimed for this delivery.** Without a key, deterministic requirement organization and source summaries remain available. Live site failures are shown, not disguised as successful retrieval.

## Actual delivered source and data

Ordinary application source is now in `v4/`; there is no need to decode the old V2 bootstrap bundle.

| Item | Verified scope |
|---|---|
| Official corpus | **1,114 distinct fetched HTML article records**: Shanghai600 + Beijing514 |
| Count definition | Unique canonical URL and normalized extracted-body hash; lists/fragments/errors excluded |
| Content status | Includes public services, transport, payment, destinations and historical events; NOT 1,114 current rules independently reviewed |
| Reviewed source cards | 7 short cards, with explicit source dates and gaps; separate from bulk index |
| Initial code/HTTP tests | 44 passed in the first V4 verification run |
| Initial browser checks | 13 passed against a real local Node backend on the runner |
| Model/real users | No paid-key quality test; no traveler trial or production performance claim |

[Official collection report](data/official/collection-report.json) · [JSONL records](data/official/records.jsonl) · [Successful collection run](https://github.com/cxy-peter/visit-china-ai-agent/actions/runs/36033307717) · [Successful initial V4 browser/HTTP run](https://github.com/cxy-peter/visit-china-ai-agent/actions/runs/36035360063)

The collection requested1,200 and reached1,114; the minimum1,000 was met, the optional5,000 was not. Only titles, metadata, short excerpts, hashes and publisher image links are redistributed, not a full mirror of third-party websites.

## Workflow

```
Conversation -> numbered needs -> explicit confirmation
 -> metadata/keyword retrieval -> bounded official HTTP access
 -> DeepSeek node generation when supported by retrieved text
 -> citation-ID / numeric / unauthorized-action checks
 -> source details, audit record, user outcome
```

Checks are not independent semantic accuracy. A quote or successful HTTP200 is not a guarantee that a rule remains effective or applies to a particular traveler.

Sources include a primary Tenpay notice for Weixin international-card fees, official airport services, Shanghai Metro and12306. **The current Alipay operator fee rule was not independently verified; Weixin rates are not reused for Alipay.** Social experience leads and research benchmarks are kept separate from policy evidence.

## Preview and deployment

```bash
npm run build
# dist/Visit_China_AI_V4_Demo.html: self-contained default-mode preview
# dist/: ordinary static frontend files
```

Vercel configuration here is for the static preview only. A public site cannot read your computer's localhost. Full cloud model execution requires a properly authenticated backend and persistent cross-instance state; the local in-memory session implementation is not production cloud infrastructure.

## Documents

- [Product, evidence corpus and research findings](docs/V4_PRODUCT_AND_RESEARCH.md)
- [Local deployment, DeepSeek and Codex handoff](docs/V4_DEPLOYMENT_AND_HANDOFF.md)
- `tools/collect_official.py`: bounded, robots-aware collection; requested limits do not guarantee counts.
- `v4/tests.js`, `v4/browser_test.py`, `v4/live_smoke.js`: contract, real-browser HTTP and separate live-source checks.

## Version boundary

V4 focuses on conversation, confirmation, real API code and evidence. It does not claim to have ported all the earlier V3 mock charging orders, supplier flows and replay UI. Those remain in the earlier downloadable V3 package. Old `.bootstrap` files and their failed workflows are historical transport attempts, not part of the runnable V4.

No credentials, private internship documents, customer data, copied OTA assets or font files are included. Live images remain publisher links with separate rights. There is no real booking, payment, charging inventory, customer-service staffing, or deployed Vercel site in this repository delivery.
