import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const directory = await mkdtemp(join(tmpdir(), "fabric-tests-"));
try {
  for (const suite of [
    "simulation",
    "audit",
    "policies",
    "cinematic",
    "entry",
  ]) {
    const outfile = join(directory, `${suite}.mjs`);
    await build({
      entryPoints: [`tests/${suite}.${suite === "entry" ? "tsx" : "ts"}`],
      bundle: true,
      platform: "node",
      format: "esm",
      jsx: "automatic",
      outfile,
      logLevel: "silent",
      banner: {
        js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
      },
    });
    const result = spawnSync(process.execPath, [outfile], { encoding: "utf8" });
    if (result.status !== 0) {
      process.stderr.write(result.stderr || result.stdout);
      process.exitCode = result.status || 1;
      break;
    }
    let summary = result.stdout.trim();
    try {
      const report = JSON.parse(summary);
      summary = `${report.cases} cases${report.coverage ? ` · ${report.coverage}` : ""}`;
    } catch {
      // Text-based suites already return a concise human-readable summary.
    }
    console.log(`PASS ${suite}: ${summary}`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
