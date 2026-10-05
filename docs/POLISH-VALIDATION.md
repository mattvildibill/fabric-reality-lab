# Recruiter-ready revision — 5 October 2026

## Changes

- Removed the introductory film, guided walkthrough, unused components and their styles. The complete lab now opens in Fabric view with the seeded 1% experiment running at 2 simulated µs, before its scheduled 30 µs intervention. Reduced motion starts paused.
- Reorganized architecture choices and placed detailed traffic settings in a disclosure. Moved the queue-pressure map into the inspector so it no longer covers the network. Preserved every workload, architecture, view, assumption, trace, analysis and export control.
- Made playback state explicit and made Play replay completed runs. Unapplied settings have a visible pending label; current-run titles remain tied to executed state.
- Fixed selected intervention fidelity for the 1% preset and paired replay. Manual failure injection replaces scheduled fault/repair events rather than retaining a contradictory repair clock.
- Added a reproducible `npm test` command and direct-entry, manual-failure, repair and server-render regressions. Formatted the main UI and CSS for maintainability.

## Automated verification

The test command covers the original 26 simulation cases, 92 audit cases, 26 policy/scheduler cases, reconstruction equivalence and 128 final-round dependency bounds, plus new direct-entry/UI and intervention checks. Model coverage includes all 44 architecture/workload pairs, failure combinations, deterministic replay, serialization, byte conservation, queue drainage, local dependencies and async/sync equivalence.

Passed on the final application code:

- `npm test`: all five suites, including the new direct-entry and intervention regressions.
- `npm run typecheck` and `npm run build`: passed; no CSS compiler warnings.
- `npm run build:offline`: regenerated a self-contained HTML with zero external runtime scripts or stylesheets.
- Focused ESLint on `FabricLab.tsx`, `experiment.ts`, `entry.tsx` and the test runner: zero findings.
- `git diff --check`: passed.

Full-repository ESLint still reports 139 errors and 8 warnings in legacy simulation, rendering, analysis and existing test code. This is disclosed debt, not a passing lint result. No lint rules were disabled. Prior `QUALITY.md` describes historical QA and must not be read as fresh evidence for this revision.

Public-browser verification is pending deployment at the time of this commit.

## Limits

Local browser navigation is blocked in this execution environment. Production/custom-domain browser QA is performed after the authorized deployment. Responsive CSS inspection alone does not constitute device testing. A software-renderer check does not verify GPU drivers or physical touch hardware.
