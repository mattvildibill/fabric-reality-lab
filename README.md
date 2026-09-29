# Fabric Reality Lab

An independently built, browser-native 3D network wind tunnel. It is a reduced-scale experiment, not a vendor benchmark or a digital replica of a real installation.

Open the deployed site or download `public/Fabric-Reality-Lab.html` and open it directly in a modern desktop browser. The HTML is self-contained and uses no external runtime services. WebGL rendering is preferred; a software perspective renderer preserves the 3D controls when WebGL is unavailable.

The app opens with a six-chapter **guided walkthrough**. Read at your own pace with Next / Back, or choose the 90-second autoplay. Opening technical details pauses autoplay. The tour follows one fixed seeded all-reduce experiment through a recorded packet, healthy completion, a one-link derating, and inspectable evidence. Baseline and impaired numbers are computed by the simulation. **Explore the lab** reveals the complete controls; **Start walkthrough** returns to the introduction. Explore **The 1% problem**, **Cause trouble**, **Packet**, **Graph**, and **Paired architecture replay**. The methodology panel maps architectural facts to primary sources and explicitly separates documented, modeled, assumed, and inferred behavior.

**Analyze run** opens three quantitative views: a common-axis round waterfall with 128-rank arrival drill-down, an 8 × 8 delivered-byte matrix, and flow-latency histograms. Compare global round barriers against local send/receive dependencies in the same view. Select a rank or switch pressure cell to inspect its component in 3D.

## Model

- 128 explicit ranks, 32 access switches, 2,048 conceptual endpoints represented visually.
- Deterministic discrete-event chunk/packet processing, full-duplex link serializers, bounded output queues and non-preemptive traffic priority.
- Reduced dragonfly-like, folded Clos, and two-plane graphs.
- Eleven workloads, eight interventions, seven recursive-doubling rounds with configurable global or local dependencies, or an optional ideal 14-stage reduction/broadcast.
- Full-path queue scoring is a simplifying assumption. Control laws are abstractions, not proprietary or normative implementations.
- Routing, packet timing, graph centrality and paired outcomes come from executed state.
- Main-engine source: `lib/fabric/simulator.ts`; topology and exact switch-graph Brandes metrics: `lib/fabric/topology.ts`; source map: `lib/fabric/catalog.ts`.

## Validation

`tests/simulation.ts` checks deterministic replay, topology connectivity/diameter, all 11 workload generators, payload conservation, queue drainage, all eight interventions, eventual recovery, paired derating impact, and ideal-tree byte counts. The original 26 cases pass. `tests/audit.ts` adds 92 cases spanning the 44 architecture/workload and 32 architecture/intervention combinations, local dependencies, bounds, timestamp invariants and asynchronous equivalence. `tests/policies.ts` adds policy combinations and exact priority/FIFO scheduling checks. Incidents requiring longer than the 4,000 µs comparison horizon are correctly censored; the recovery tests permit 20,000 µs.

Browser QA exercises the software 3D fallback because WebGL is disabled in the available test browser. The GPU branch compiles but could not be visually exercised there. Test actions include failure injection, architecture changes, trace playback, graph mode, assumptions, paired replay, source panel and standalone HTML. Phone and tablet layouts stack controls and analysis panels; wide displays retain the full workspace. Portrait cameras fit the complete machine. Keyboard controls, descriptive slider labels, focus states, reduced-motion handling and HTML download remain available. The scene includes per-adjacency switch ports, module geometry, physical cabinet islands, recorded-direction packet trails, capacity-normalized queue columns, and highlighted top-five centrality edges. The switch pressure map uses largest outgoing queue while running and peak attached-link queue after completion; these measures are explicitly distinguished. Packet timing bars share the recorded packet clock. GPU rendering includes soft shadows and screen-space line widths; the software renderer preserves the same data encodings.

## Developer commands

The recipient does not need these commands.

- `npm run dev` — development site
- `npm run build` — production Worker and assets
- `node scripts/build-offline.mjs` — self-contained HTML
- `./node_modules/.bin/esbuild tests/simulation.ts --bundle --platform=node --format=esm --outfile=/tmp/fabric-tests.mjs && node /tmp/fabric-tests.mjs`

The repository preserves the Sites starter and its lifecycle scripts. React, Three.js, Radix and the other bundled packages retain their respective licenses; third-party legal comments are preserved inside the offline bundle.

## Interaction and runtime fixes

Simulation clocks cannot regress when finishing a partial run. Paired replays use immutable input snapshots and yield between bounded event batches; closing the comparison cancels its work. Censored makespans carry a lower-bound marker and never receive a misleading percentage improvement. Failed output queues abort queued attempts instead of continuing service, and traces preserve those attempts. Trace capture cycles through different completed packets. Reset view resets the camera even if the selected mode has not changed. The walkthrough uses an independent elapsed-time update so packet playback cannot stall chapter advancement.

`tests/performance.ts` exercises dense 1 MiB traffic against 32 KiB buffers and reports chunk timings without treating them as hardware performance. The standalone file is about 1.3 MB, with all runtime assets inline and no account, key, installation or external API requirement.

## Connected guided experience

The opening experience links physical scale, a deterministic synchronized paired replay, final-round rank dependencies, a retained packet trace, and a topology morph. Both renderers share the original simulation records. Seeking reconstructs both runs from the seed, processing all events at the requested timestamp; it does not reverse the live event queue. Rank barrier waiting begins after both send and receive complete. The final packet is evidence for its own route and queues, not a claim that it alone explains the intervention's total effect. Physical cabinet placement is illustrative. No generated media or external APIs are used.

`tests/cinematic.ts` checks twelve timestamp reconstruction cases, retained final-packet evidence, and all 128 final-round rank dependency bounds. The original 92-case audit and TypeScript validation also pass for this update.

## Automatic scale film (revision 7)

The opening is now a 72-second full-screen sequence that starts automatically, with pause/replay, direct seeking, and an optional browser read-aloud. Reduced-motion visitors start paused. It uses new cabinet, board, port, heatsink, die-block and micro-interconnect geometry in `ScaleScene.tsx`. The WebGL path batches hardware into six instanced meshes, plus batched traces and two signal meshes; there are no per-link draw calls or live simulation events during film playback. A software projection fallback renders the same geometry when WebGL is unavailable.

`node_modules/.bin/esbuild scripts/record-film.ts --bundle --platform=node --format=esm --outfile=/tmp/record-fabric-film.mjs && node /tmp/record-fabric-film.mjs` regenerates the small deterministic evidence recording. Hardware/circuit geometry and moving signal/queue blocks are illustrative, not a transistor-level simulation. Recorded completion figures and final-packet hop timings remain directly sourced from the original engine. The full lab is preserved behind Open the lab.
