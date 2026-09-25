# V5.8: Shanghai metro routing, model intent and answer resolution

## Behavior

- An authorized, consenting DeepSeek session makes one structured provider call per ordinary turn. The model identifies the current transport intent, origin, destination and optional via station using recent conversation and corrections. The server validates that schema and executes only the corresponding read-only tool. Metro routing and fares are not invented by the model.
- Without a model connection, the same station graph is usable locally; the conversation offers a visible DeepSeek connection action when the deployed model is available. Private access, consent, low-power behavior, cancellation and revision checks remain in place.
- Pudong Airport / 浦东机场 aliases to 浦东1号2号航站楼. Shanghai Railway Station / 上海站 remains distinct from 虹桥火车站. The metro journey is Line 2 to 人民广场, then Line 1 towards 富锦路 to 上海火车站; no intercity ticket cards accompany this request.
- Each route has Chinese/English endpoints, transfer diagram, all intermediate stops, a network overview, editable endpoints and an optional via station. Existing quick origin choices and the metro skill remain available.
- ✓ Solved / ✕ Not solved is attached to each answer. Negative reasons: wrong intent, wrong route, missing detail, other. Ratings are upserts per anonymous visitor/conversation/answer. Admin triage does not alter the traveler's outcome. Negative reasons are included in future DeepSeek workflow-suggestion inputs; suggestions still require existing review and publication gates.

## Data provenance and boundaries

The network is a dated public Amap station-connectivity snapshot retrieved on 2026-09-25: 418 unique station names, 20 metro lines, 23 branch paths. `v5/metro-data.js` includes its retrieval date, upstream URL and raw-response SHA-256. Station names, English labels, line colors and schematic station positions are factual data extracted from the public response, with attribution retained. Maglev and the Airport Link are excluded from the metro graph.

- Amap public data: https://map.amap.com/service/subway?srhdata=3100_drw_shanghai.json
- Amap interactive network: https://map.amap.com/subway/index.html?city=3100
- Official reference map (2024 edition): https://english.shanghai.gov.cn/en-Latest-WhatsNew/20240924/b625d488216241f78f743cd87a40df0c.html
- Official renamed stations: https://www.shanghai.gov.cn/nw4411/20240922/f5fd81dbfe9244a298fd13806c993ca3.html
- Official Line 2 extension opening: https://service.shanghai.gov.cn/SHVideo/videoshow_933E0E51A7DEB228_0.html
- Official current operations: https://service.shmetro.com/

The operator portal timed out during this release's direct fetch. This is a local station graph with source links, NOT an authorized live Shentong operations API. It cannot guarantee current service, last trains, fare, exit availability, elevators or street walking routes. The algorithm prioritizes fewer transfers, then fewer stops; it does not claim shortest journey time. Branches and circular lines are modeled separately. Re-entry/exit and ticket rules at an interchange must still be checked with the operator. Snapshot updates require a reviewed code/data release; the existing three-day source checker does not silently replace this graph.

## Metrics

Operations → 问题解决反馈 includes counts, rated-answer solve rate, feedback coverage, intent filter, route, processing mode, negative reasons and admin triage status.

- Solve rate = latest solved ratings / latest ratings. Unrated is not unresolved.
- Feedback coverage = shown answers with ratings / recorded shown answers; joined by anonymous conversation and answer id.
- Visitor identifiers are anonymous and expire; metrics are not person-level retention or purchase conversion. QA interactions can appear in the live dataset.
- Store only enums, answer ids and recognized route station ids; do not send full conversation text or audio. Retain latest 2,000 ratings / 30 days. Existing analytics event retention remains 8,000 / 30 days.
- The synthetic dashboard dataset does not create fake quality outcomes.

## Verification

204 Node tests, voice-worker type check, production build, preserved original browser regression suite, and focused metro/feedback browser checks. Provider fixtures test malformed schema, city/source boundaries and stale-response cancellation. Actual hosted DeepSeek intent and persistent Operations validation are recorded in the release evidence after deployment. Human microphone recognition accuracy and live metro operations are not measured.
