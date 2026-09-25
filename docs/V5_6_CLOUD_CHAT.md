# V5.6 — cloud DeepSeek, quieter voice input and metro guidance

The public site now includes `POST /api/chat`, a stateless Vercel Function using the same `v5/assistant.js` and server-side DeepSeek client as the original Node application. Text, local voice transcripts, selected source summaries, recent conversation and preferences share that path. The API key stays in Vercel. The function does not create a cloud conversation database or deploy the SQLite review/SSO service.

## Production setup and use

Configure Production `DEEPSEEK_API_KEY` and a random `TRAVEL_CHAT_ACCESS_CODE` of at least 24 characters in Vercel, then redeploy. Optional `DEEPSEEK_MODEL` defaults to `deepseek-flash`. Never place either credential in Git, frontend assets, screenshots or public release archives.

Open chat settings (gear), enter the private access code and choose **连接并启用 DeepSeek**. This is explicit permission to send cleaned conversation text and selected saved summaries to the provider. The API key is never entered into the browser. Access is stored in an eight-hour HttpOnly, Secure, SameSite cookie. Consent survives refresh within the same browser tab; disabling consent or disconnecting stops model use. The interface displays pending answers and provider failures inside the transcript.

DeepSeek API usage is paid separately. The default voice recognizer remains open-source, on-device Vosk with local system TTS and has no speech API fee. The function has a small token limit, timeout and secondary per-instance request throttle. That throttle is not a durable global spending cap; monitor provider usage. There is no payment or booking integration.

## Voice and conversation changes

- Single characters, fillers and fragments without a recognized travel intent are ignored without advancing the trip or generating a reply. Short city names and relevant contextual answers are accepted. This is a conservative heuristic, not a semantic accuracy guarantee; text input remains available for anything it misses.
- Normal voice commits a finalized phrase after a short pause. After **打断并说话**, an accepted ASR final can submit immediately. Raw partial transcripts are never committed merely because they pass a character count. Playback returns to listening automatically.
- Live captions occupy a bubble inside the scrollable transcript. A finalized user turn appears once; the separate “recently sent” caption is removed. The composer contains input, settings and send. Choices, examples and draft recovery live in the conversation; jump-to-latest overlays it.
- New-chat/reset behavior, opt-in preference carry-over, opening request, bilingual output, source provenance, stale-generation cancellation, low-power behavior and five-distinct-reviewer rules are retained.

## Metro and illustrative transport

Yu Garden cards support Hongqiao Railway Station → Line 10, East Nanjing Road → Line 10 and Lujiazui → Line 14. The diagram distinguishes the metro station from the attraction and includes the final walk. No live location, exit opening, exact walking time, fare or service-status claim is made. The expandable full network image is explicitly the **2024 edition**, linked from the [municipal publication](https://english.shanghai.gov.cn/en-Latest-WhatsNew/20240924/b625d488216241f78f743cd87a40df0c.html); current information should be checked at the [operator portal](https://service.shmetro.com/).

The reusable [Shanghai metro skill](../skills/shanghai-metro-guide/SKILL.md) documents departure/attraction clarification, map provenance and route boundaries. It is served on the website at `/skills/shanghai-metro-guide/SKILL.md`.

Mock cards include inbound trains to Shanghai, outbound Shanghai trains and inbound flights, preserving explicitly requested directions. All departures, sample prices and inventory are fictional and labeled. Links lead to platform search pages, not a completed reservation or live quote.

## Verification

Run `npm test`, `npm run voice:check`, `npm run voice:build`, `npm run build`, and the five V5 browser scripts in CI. `cloud-chat.test.js` covers access, origin, consent, expiry, history bounds, usage, provider errors, budget, silent noise rejection, maps and directional examples. `cloud_browser_test.py` checks the browser contract with HTTP fixtures. Real Vosk WASM runs synthetic English/Chinese audio; no claim is made about human microphone quality or hands-free acoustic interruption. Evidence is under `evidence/v5.6/`.

Production acceptance must separately verify `/api/chat`, a real `mode: deepseek` response with provider token usage, the deployment commit and asset hashes. Provider test doubles do not prove that a configured production key works. Deployment evidence is delivered separately after release.
