# Quality review — 9 September 2026

## Changes made after expert and interaction review

- Corrected non-monotonic simulation finishing, nearest-rank percentiles, failed-queue retry records, and manual-repair recovery timing.
- Added local send/receive dependencies alongside the explicit global-round abstraction. MPI collective completion does not universally imply a global barrier; this distinction is documented and directly comparable.
- Added recorded round waterfalls, rank arrival and wait/spread maps, group traffic matrix, completed-flow latency distributions, and links from analysis into component inspection. Histograms share a latency axis; incomplete messages are disclosed.
- Fixed trace cycling and highlighted actual recorded hop histories rather than an overwritten reroute path. Aborted attempts are visible. Camera reset works without changing mode, and portrait framing fits the system.
- Fixed autoplay elapsed-time capture: packet replay could otherwise prevent chapter progress. The full automatic walkthrough was observed reaching 100% at chapter six and stopping.
- Bounded live and paired-replay event processing, cancellable comparisons and analysis, immutable comparison inputs, and invalidation of stale results. Static software-renderer frames reuse the previous image when state has not changed.
- Added slider names at the actual ARIA slider element, keyboard-operable rank and pressure cells, larger phone targets, reduced-motion handling, stacked tablet controls, accurate metric labels, and immediate modal closing.

## Automated correctness

144 cases pass: 26 original simulation checks, 92 cross-workload/failure/dependency/boundary checks, and 26 policy/scheduler checks. Coverage includes all 44 profile/workload pairs, 32 profile/intervention pairs, deterministic replay, exact serialization, byte conservation, queue drainage, nonnegative timestamps, eventual repair, local dependency prerequisites, censoring, async/sync equivalence, priority/FIFO order, and configuration limits. TypeScript and the production build pass.

## Interaction and visual checks

Browser checks covered all six chapters and full 90-second autoplay, trace playback/scrubbing/cycling, all eleven workload selectors, all four architecture buttons, all five view modes, all eight link-domain filters, all three traffic-class filters, rank filtering, payload/seed/speed controls, all assumption sliders and switches, live intervention and manual repair, camera reset, paired replay/recalculation/export/invalidation, the methodology panel, and analytical drill-downs. The model suite exercises every failure type and policy combination independently of the UI.

Phone (390 CSS pixels), tablet (768) and desktop (1363) were inspected. The phone/tablet checks use a same-origin viewport iframe with actual responsive CSS, not image rescaling. Page and analysis content had no unintended horizontal overflow; intentionally wide comparison tables use a local scroll area. Focus rings, keyboard navigation, dialog sizing, readable labels and empty-state disclosures were reviewed.

The downloaded HTML was opened through the internal preview and exercised as a standalone bundle. Static inspection confirms one inline script, bundled CSS, no external runtime scripts/styles/API calls, and no added personal references. The artifact is about 1.3 MB.

## Performance and limits

A local dense-traffic stress run processed approximately 9.56 million events in 4,867 bounded calls: p95 2.88 ms, p99 8.90 ms and observed maximum 56.96 ms. These are development-runtime observations, not hardware or cross-browser benchmarks. Work chunks check elapsed time every 32 events, so occasional overruns remain possible.

The available browser disables WebGL; its software 3D fallback was visually and interactively exercised. The GPU branch compiles and was reviewed, but its lighting, drivers and rendering were not visually verified. Mobile checks cover responsive layout, not a physical phone’s GPU or touch hardware. No full assistive-technology certification is claimed.

This remains an educational reduced store-and-forward model. It does not emulate proprietary controllers, real switch flits, device memory transport, normative transport compliance, or a production installation. Comparisons are model experiments, not vendor rankings.
