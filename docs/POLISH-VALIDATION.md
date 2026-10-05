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
- `npm run lint`: whole-repository ESLint passes with zero errors and zero warnings. No rules were disabled.
- `git diff --check`: passed.

Legacy lint findings were resolved with const declarations, concrete event/queue/rendering types and removal of unused locals/imports. Numerical formulas and event behavior are unchanged. Prior `QUALITY.md` describes historical QA and must not be read as fresh evidence for this revision.

## Public browser verification

Checked the production custom domain at commit `3fc5ad1b3a22b50d67ef4b0903a78f92b0413f4e` with Vercel reporting READY for that exact SHA:

- Direct entry shows seeded simulation time, completed-packet telemetry and live traffic, with no film/walkthrough. The scheduled optical intervention was observed at 30 µs.
- Pause, reset/restart, architecture switching, packet capture, next trace and inspector hide/show passed.
- Completed-run analysis and replay passed. Paired replay closed and reopened correctly; all four architecture rows completed. Changing a comparison assumption cleared stale results and disabled export until recalculation.
- No unexpected application console errors were observed. Desktop layout at 1188 CSS pixels had no horizontal overflow. The pressure map stays inside the inspector, leaving the network visible.

The browser has WebGL explicitly disabled, so the software renderer was exercised. This does not certify GPU rendering. Physical mobile, touch hardware and a mobile-sized viewport were not exercised in this environment.

## Limits

Local browser navigation is blocked in this execution environment. Production/custom-domain browser QA is performed after the authorized deployment. Responsive CSS inspection alone does not constitute device testing. A software-renderer check does not verify GPU drivers or physical touch hardware.
