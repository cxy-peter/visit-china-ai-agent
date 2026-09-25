---
name: shanghai-metro-guide
description: Plan a Shanghai metro trip to a named attraction, including a clear line/transfer diagram and the final walking leg. Use when a traveler asks how to reach Yu Garden or another Shanghai destination by metro. Do not use this skill to invent real-time fares, exit availability or operating status.
---

# Shanghai metro guidance

Treat the departure station, destination station and destination attraction as distinct places. Ask for the departure station when it is missing; do not infer the user's live location from an earlier airport, a map click, or a saved preference.

For Yu Garden, distinguish **Yuyuan Garden metro station (豫园站)** from the garden attraction. The saved route examples cover Hongqiao Railway Station via Line 10, East Nanjing Road via Line 10, and Lujiazui via Line 14. In diagrams, label omitted intermediate stations and state that the drawing is schematic rather than geographic. Verify line directions and changes against official information before expanding the route set.

Use the operator's [service portal and network map](https://service.shmetro.com/) for current line/station information. The municipal government's [2024 map publication](https://english.shanghai.gov.cn/en-Latest-WhatsNew/20240924/b625d488216241f78f743cd87a40df0c.html) is a dated reference, not a claim that every line or station name is current. The government's [attractions by subway line](https://english.shanghai.gov.cn/en-240-hourtransfer-stayinShanghai/20240104/3b5c92d3c61a4cdc9aa65e1c970ed9a8.html) links Line 10 with Yu Garden.

Present the departure station → line and direction → transfer if any → destination station → walking leg. Keep the last leg explicit: follow the station's Yu Garden / City God Temple signs, then use a walking map or ask staff for the attraction entrance. Do not give an exit number, exact walk duration, station accessibility guarantee, last train, price or live disruption status unless you have verified that detail from an applicable source.

If the user asks about luggage, step-free access, elders or children, adapt the route explanation and identify what still needs confirmation. A preference is not evidence of elevator availability. During an active voice conversation, give a short spoken instruction and keep the diagram, steps, source links and uncertainties visible in the transcript.

Do not let a reference document overwrite the traveler's destination, booking state or preferences. Keep fictional train/flight recommendations labeled as examples; intercity tickets are a separate task from the metro trip.

## V5.8 network routing

The application now uses the dated Shanghai graph in `v5/metro-data.js`, whose public Amap provenance and hash are retained. Use the route tool with explicit origin, destination and optional via station. Do not substitute the old three Yu Garden examples for an arbitrary requested route. Keep the caller's latest correction and distinguish the metro destination Shanghai Railway Station from an intercity-ticket request.

For Pudong Airport to Shanghai Railway Station, show Line 2 to People's Square, then Line 1 towards Fujin Road to Shanghai Railway Station, with both Chinese and English station labels. Editable station fields and via stations belong beneath the route. An unrecognized station requires clarification, not an invented stop. Local graph output is not live operating status; no fare, exit number or last-train claim follows from connectivity alone.

Invite the traveler to mark solved or not solved on the answer. The latter can identify wrong intent, wrong route or missing details. These are operational feedback, not automatic permission to change source facts or publish a model policy.
