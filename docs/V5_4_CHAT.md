# V5.4: conversation first, optional preferences and travel examples

The main screen now opens as a chat, with a pastel background and left/right message bubbles. Call controls stay above the conversation. Text input and live speech captions remain in the same workspace, and new messages reveal the latest user's request before the recommendation cards. Existing first-request capture, 30-turn canonical history, redaction, session revision checks, draft recovery, source checks and five-account approval rules remain in place.

## Voice and language

Vosk remains the free, open-source, on-device default. No LiveKit account is required. Microphone access still requires the user to start the call and consent; merely opening chat does not record audio. Local system voices handle playback when installed. Recognition and reply language now have separate controls. Auto output follows Chinese or English input in either direction; choosing a fixed reply language does not change ASR language. Switching input language during a local call reloads the selected recognizer and preserves an unfinished draft.

Natural recognizer phrase boundaries accumulate into a multiline draft. Approximately 1.4 seconds of silence requests a final result from the recognizer; only final recognized audio becomes a submitted turn. The manual Send speech button uses the same path. A missing final result retains an editable draft after a timeout, and does not invent a completed utterance. Playback ends by returning to listening. The actual WASM test feeds synthetic English/Chinese PCM, including a second English turn without restarting the call. This is not a human accent, noise or microphone quality study, and it does not claim full-duplex interruption.

## New chat and preferences

New chat clears the old destination, facts, tasks, opening request, transcript, recommendation cards and call identity. Reset clears the current conversation while retaining its preference choices. These actions operate on the current chat; there is no archive browser or unlimited history claim.

Budget, pace and food preferences can be selected, deselected or updated by supported natural-language phrases. Only an explicit carry-over checkbox stores them for new chats. This preference storage is independent of the existing optional transcript memory. It cannot restore a booking, confirmation or workflow. Preference chips appear above the chat and in the right panel, with a compact editor available on mobile. “Recommend” creates a new reply using current needs/preferences; old recommendations retain their original context.

## Recommendation examples

Hotel, flight, rail and restaurant examples are attached to the relevant assistant turn. All names, service times, inventory and prices in these cards are simulated; no platform API is connected and no reservation is created. Historical cards keep their original city and preference snapshot. Boston/New York rail examples link to Amtrak; Chinese rail examples link to 12306. Provider links open the provider's site, without transferring a booking or passenger details.

## Taxi estimate

The calculator accepts road distance, low-speed/wait minutes and known extra fees. It covers daytime one-way metered taxis in Shanghai and Beijing, not ride-hailing fixed prices, night tariffs or intercity charters. Shanghai includes the 14/16 CNY base variants, 2.7 CNY/km beyond 3 km, the extra 50% beyond 15 km, and a continuous approximation of waiting charges. Beijing includes the 13 CNY base, 2.3 CNY/km, the one-way long-distance surcharge, peak waiting option and optional 1 CNY fuel fee. A separate display shows the effect of distance ±10%; it is a sensitivity range, not a fraud threshold or confidence interval. Meter rounding, Shanghai operator/holiday tariff adjustments and fees not entered can change the actual fare. Unsupported cities do not inherit another city's tariff.

References checked September 24, 2026:

- [Shanghai transport authority tariff table](https://jtw.sh.gov.cn/czqcyj/index.html)
- [Shanghai tariff adjustment explanation](https://jtw.sh.gov.cn/zsk/20220119/df77a6e1817b4a269464fe575c572ebb.html)
- [Beijing transport authority taxi tariff](https://jtw.beijing.gov.cn/czqc/zxts/202303/t20230310_2933641.html)

## DeepSeek and deployment scope

The existing Node backend calls DeepSeek for consented, authorized fact proposals and grounded guide generation. It validates quoted evidence and requires confirmation before adopting proposed facts. This is separate from the free deterministic chat replies. The website displays this distinction instead of pretending that an immediate rules response is model generation.

As checked for this release, neither this checkout nor the Vercel project has a DeepSeek API key configured. The public Vercel build is static and has no persistent Node backend. Consequently no real DeepSeek call, paid inference, platform inventory query, shared production SSO or shared review workflow is claimed. Configuration belongs in a backend environment or authorized Operations session, never in browser source or chat messages.

## Verification

```sh
npm test
npm run voice:check
npm run build
python v5/browser_test.py
python v5/chat_browser_test.py
python v5/local_voice_browser_test.py --en v5/fixtures/synthetic-en.wav --zh v5/fixtures/synthetic-zh.wav
```

Reports and screenshots are under `evidence/v5.4`. The original V4 source library remains available at `/v4/`. The existing browser/LiveKit fallback and durable five-distinct-account review implementation remain intact.
