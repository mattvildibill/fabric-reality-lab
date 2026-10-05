import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import FabricLab from "../components/fabric/FabricLab";
import { OPENING_CONFIG, openingSimulation } from "../lib/fabric/experiment";
import { Simulation } from "../lib/fabric/simulator";

const opening = openingSimulation();
assert.equal(opening.time, 2);
assert.equal(opening.injected, false);
assert.ok(opening.packets.length > 0);
assert.ok(opening.samples[0].active > 0);
assert.deepEqual(opening.packets, openingSimulation().packets);
opening.advance(31);
assert.equal(opening.impairment, "optical");
assert.equal(opening.failureAt, 30);
assert.equal(opening.affectedLinks.length, 1);

const manual = openingSimulation();
manual.intervene("cut", 40);
assert.equal(manual.failureAt, 2);
assert.equal(manual.impairment, "cut");
assert.equal(manual.heap.a.filter((e) => e.type === "trouble").length, 0);
assert.equal(manual.heap.a.filter((e) => e.type === "repair").length, 1);
assert.equal(manual.c.repairAt, 42);
manual.intervene("noise", 5);
assert.equal(
  manual.impairment,
  "cut",
  "an active intervention cannot be silently replaced",
);
assert.equal(manual.c.repairAt, 42);
manual.advance(43);
assert.equal(manual.repaired, true);
assert.equal(manual.c.repairAt, 42);
const finished = manual.finish(4000);
assert.equal(finished.censored, 0);
assert.equal(
  finished.bytes,
  manual.flows.reduce((sum, flow) => sum + flow.bytes, 0),
);
assert.equal(manual.events.filter((e) => e.kind === "fault").length, 1);

const selectedFault = new Simulation(
  { ...OPENING_CONFIG, trouble: "switch" },
  true,
);
selectedFault.advance(31);
assert.equal(
  selectedFault.impairment,
  "switch",
  "paired replay must honor the selected fault",
);

const html = renderToStaticMarkup(<FabricLab />);
assert.match(html, /The <span>1%<\/span> problem/);
assert.match(html, /Pause simulation/);
assert.match(html, /Experiment controls/);
assert.match(html, /Experiment inspector/);
assert.match(html, /Traffic &amp; replay settings/);
assert.doesNotMatch(
  html,
  /Guided film|Start walkthrough|Open the lab|scale-film|tour-story/,
);
assert.match(html, /No vendor benchmark data/);
assert.ok(
  html.indexOf("Switch queue pressure map") >
    html.indexOf("Experiment inspector"),
);
console.log(
  "Direct entry: deterministic live start, selected/manual fault, repair, conservation, controls, and no intro passed.",
);
