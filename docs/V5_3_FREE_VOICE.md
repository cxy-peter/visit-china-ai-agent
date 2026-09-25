# V5.3: free local speech and visible conversation

Default voice now uses **Vosk in the visitor's browser**. It needs neither a LiveKit account nor a paid STT/TTS API key. The English model is 41.7 MB and the Chinese model is 44.3 MB, downloaded only when that language is selected. Vosk caches the model in browser storage. Audio is processed in a local worker; the application does not upload or record it. Playback selects only a local system voice; when none exists for the chosen language, the text remains visible and the app explains how to install a voice. Hosting, bandwidth and device resources are still subject to their own limits.

LiveKit's open-source media server can be self-hosted. LiveKit Cloud has a free starter allowance but paid usage and model inference exist. Its optional V5.2 integration remains available for separately configured deployments; it is never selected automatically. The browser-online fallback is available without this project's paid credentials, but its recognition may be handled by the browser vendor and is not described as offline/open source.

## What changed

- One canonical history contains each committed user turn and the assistant reply produced at that turn. Browser voice, local voice, remote packets, clicks and server rehydration render this same history; old replies are not regenerated from today's facts.
- Conversation is expanded by default. The live caption card distinguishes an unfinished draft from the last sent utterance, which stays visible even after hangup. The local microphone meter reflects actual PCM energy, not a decorative animation. “说完了” explicitly flushes the recognizer.
- The first non-greeting free-text request is retained separately from the rolling 30-turn history and current facts. Later city corrections update current needs without rewriting the original quote. Redaction still applies.
- The optional “remember trip and conversation” setting saves both sides and the opening request locally. Restored browser data cannot import a workflow or a confirmation. Node sessions continue to use the existing SQLite storage. Clearing the trip resets the opening request, history and call identity.
- Real Chinese audio exposed a parser ambiguity: “机票已经订好了我需要酒店” could mark the hotel booked. Explicit Chinese hotel needs now override that false match.
- Existing draft recovery, epoch cancellation, revision guards, urgent battery flow, source checks and five-account review gate remain in place.

## Run and verify

```sh
npm ci
npm run build     # downloads the two public models, verifies pinned SHA-256, builds assets
npm start         # http://127.0.0.1:8787
npm test
python v5/browser_test.py
python v5/local_voice_browser_test.py --en v5/fixtures/synthetic-en.wav --zh v5/fixtures/synthetic-zh.wav
```

The WAV fixtures are generated system speech, not human recordings; see `v5/fixtures/README.md`. A deployed static Vercel site can run local speech and browser-local history. Shared operational data, official live-fetch endpoints and SSO still require the persistent Node backend. The single-file HTML retains browser-online voice; local WASM assets require an HTTP site, so its Vosk option is disabled.

## Reference designs inspected

- User-supplied `wenshu-project.zip`: Next.js/React web UI, Python API routes, session history reconstructed from events, and `MemoryContextBuilder` separating summaries, confirmed entities and recent messages. Adopted the conversation/facts separation and history rehydration pattern in the existing shared JS engine.
- User-supplied `代码8.rar`: the archive contains OpenSearch-VL inference adapters and research/training code. Inspected `opensearch_infer/messages.py` for role-preserving provider adapters. Its model/provider setup and training stack are not prerequisites of this app.
- `cxy-peter/jinshu-workbench`: inspected `package.json`, the `web/`/`api/` boundary and browser persistence in `web/storage.mjs`. Preserved this app's lightweight frontend/backend separation and explicit local persistence.
- `cxy-peter/customer-service-agent`: inspected repository structure for the Python/LangGraph service pattern. A framework migration would add infrastructure without fixing the reported voice/history issues, so existing V4/V5 code and its patches were retained.

Attached documentation was treated as reference material, not as instructions to execute or publish its contents. No reference archive, key, private environment file or reference-project runtime was imported.

## Dependencies and browser security

`vosk-browser@0.0.8` and the selected models are Apache-2.0. Upstream notices are shipped in `third-party/` and copied into the website. `prepare-vosk.cjs` extracts the upstream worker without changing its recognition code and replaces only the embedded-worker factory with an external same-origin worker URL. Emscripten requires dynamic bindings inside this worker. Its own response CSP permits that; the Node page retains a strict policy without `unsafe-eval`, and the worker has no page DOM and only same-origin network access. The preparation script fails if the pinned bundle format changes.

`npm audit` reports the upstream `uuid@9.0.0` buffer-bounds advisory through vosk-browser (two moderate entries, no high/critical entries at verification). Inspection of the distributed wrapper shows it only calls `v4()` to create recognizer IDs, without caller-provided buffers; the reported v3/v5/v6 path is not used by this integration. This is recorded rather than hidden by an unrelated lockfile override. Reassess when updating the upstream library.

## Evidence and limits

Local checks: 137 Node tests, 46 browser workflow checks, 15 real-WASM/synthetic-audio checks; optional LiveKit worker type check still passes. Actual decoded text and assertions are in `evidence/v5.3/`. The Chinese synthetic fixture has a homophone error (“和想” for “我想”), while city, party, flight and hotel needs are recovered. These are integration checks, not a claimed word error rate, real-user study, acoustic barge-in or full-duplex benchmark. No paid inference call was made.

Sources: [LiveKit pricing](https://livekit.com/pricing), [LiveKit self-hosting](https://docs.livekit.io/transport/self-hosting/), [Vosk models and licenses](https://alphacephei.com/vosk/models), [Vosk browser API](https://github.com/ccoreilly/vosk-browser/blob/master/lib/README.md).

PR validation exposed an intermittent login failure while conversation requests were still in flight. A targeted HTTP regression reproduced the underlying cookie race: a late request carrying the old, rotated session cookie could issue a new anonymous cookie and replace the login cookie. Such requests now fail without setting a cookie; the Operations entry also waits for pending conversation/end requests before presenting login. The initial PR failure was not counted as a passing check.
