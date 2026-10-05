# Fabric Reality Lab

A browser-native, interactive 3D lab for exploring HPC and AI interconnects. Change the workload, degrade a link, then trace the resulting queues, routes and collective completion times.

**[Open the lab](https://fabric.mattvildibill.com)** · [Deployment](docs/DEPLOYMENT.md) · [Validation](docs/POLISH-VALIDATION.md)

The lab opens directly into a running, seeded experiment: 128 ranks exchange results while a small portion of the fabric is derated. The first frame is actual simulated traffic at 2 µs; the scheduled intervention occurs at 30 µs. There is no introduction or walkthrough. Reduced-motion visitors start paused and can use Play.

## Explore

- **Change the experiment.** Four architecture abstractions and eleven workloads, with reproducible seeds, configurable payloads and explicit model assumptions.
- **Inspect the network.** System, Fabric, Rack, Packet and Graph views; orbit, zoom, select components and inspect per-port queues.
- **Test a failure.** Eight interventions, manual repair and deterministic matched baseline/impaired replays. The selected intervention is honored in both manual and paired runs.
- **Follow the evidence.** Recorded packet timing, rank-arrival maps, round waterfalls, an 8 × 8 delivered-byte matrix, flow-latency histograms and exportable comparison results.
- **Take it offline.** Download the standalone HTML from the header. It includes its runtime and assets, with no account, key or external API requirement.

Space pauses or resumes the run; R replays; X toggles X-ray; 1–5 select views. Completed runs remain inspectable until replayed. WebGL is preferred, with a software perspective renderer when it is unavailable.

## What is modeled

- 128 explicit ranks and 32 access switches. The larger cabinet scene represents 2,048 conceptual endpoints, not 2,048 independently simulated ranks.
- Deterministic discrete-event, store-and-forward packet processing with full-duplex serializers, bounded output queues and non-preemptive traffic priority.
- Reduced dragonfly-like, folded Clos and two-plane graphs. Recursive-doubling collectives support either global rounds or local send/receive dependencies.
- Routing, packet timing, graph centrality and paired results are computed from executed simulation state.

This is an educational reduced model, not a vendor benchmark, proprietary controller emulator or digital replica of a production installation. Full-path queue scoring and control laws are simplifying assumptions. Architecture comparisons change topology and policy assumptions; they do not establish vendor rankings. The in-app methodology distinguishes documented, modeled, assumed and inferred behavior and links primary technical sources.

## Develop

Use Node.js 24.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run build:offline
```

`npm test` runs model, policy, reconstruction and direct-entry regressions. `npm run build:offline` regenerates `public/Fabric-Reality-Lab.html`; commit that file when changing the app so the download matches the site. `npm run lint` exposes existing legacy lint debt; see the validation report for the exact status of this revision.

## Code map

- `lib/fabric/simulator.ts`: event engine, traffic, routing, fault and recovery behavior
- `lib/fabric/topology.ts`: graphs and exact switch-graph Brandes metrics
- `lib/fabric/catalog.ts`: profiles, workload descriptions, defaults and source map
- `lib/fabric/experiment.ts`: reproducible direct-entry preset
- `components/fabric/FabricLab.tsx`: workspace and experiment controls
- `components/fabric/Scene.tsx` / `softwareScene.ts`: GPU and software renderers
- `components/fabric/RunAnalysis.tsx`: recorded-run analysis and drill-downs

The native Next.js app deploys to Vercel from GitHub. React, Three.js, Radix and other bundled packages retain their respective licenses; third-party legal comments remain in the standalone bundle.
