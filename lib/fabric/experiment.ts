import { Config, DEFAULTS } from "./catalog";
import { Simulation } from "./simulator";

/** A reproducible starting point, with no pre-recorded or decorative traffic. */
export const OPENING_CONFIG: Config = {
  ...DEFAULTS,
  workload: "onepercent",
  trouble: "optical",
};

export function openingSimulation() {
  const sim = new Simulation(OPENING_CONFIG, true);
  // Two simulated microseconds makes real traffic visible on the first frame.
  // The single automatic intervention still occurs at the declared 30 µs.
  sim.advance(2);
  sim.sample();
  return sim;
}
