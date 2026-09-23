# Visit China AI · Arrival Workspace

A personal Shanghai arrival-support prototype: trip board, source-backed field guides, a merged power-recovery flow, a pre-arrival email draft, and an operations console.

This repository is being populated with the tested V2 source. No provider keys, private internship materials, customer data or copied OTA assets are included.

The public demo uses browser-local state and deterministic tools. Optional DeepSeek classification and Amap nearby-place lookup are server-side, explicitly opt-in, and fall back when unconfigured. A POI listing is not verified charging inventory. A saved trip reference is not an imported booking.

Local runtime: Node.js 22+. Public frontend: Vercel static build, with optional protected serverless endpoints. A public Vercel deployment does not have access to a user's localhost.
