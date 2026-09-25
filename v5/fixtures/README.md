These are synthetic test utterances generated with Windows system voices (Zira and Huihui), not recordings of a person. Only used by local/CI browser tests; `.vercelignore` excludes WAV assets from website uploads.

- English: “I am planning a trip to Shanghai with my parents and I need a hotel and metro tickets.”
- Chinese: “我想带父母去上海旅游机票已经订好了我需要酒店和地铁票”

The browser test replaces getUserMedia with a MediaStream carrying these PCM samples, then uses the real Vosk WASM models and real application controller. Speech synthesis is disabled in that test to keep its audio deterministic. This verifies integration and resource cleanup, not human microphone quality or natural turn-taking accuracy.
