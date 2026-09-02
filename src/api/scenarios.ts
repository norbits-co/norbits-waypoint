// Named states the mock backend can be put into, so every screen is reachable
// without editing code. Mock mode only - the picker and this file are dropped
// from the real bundle.
export const SCENARIOS = {
  // Minecraft found, manifest loaded. The path most players take.
  default: "Found Minecraft",
  // Detection takes 5s, so the spinner can actually be looked at.
  slow: "Searching (slow)",
  // No .minecraft - almost certainly a Bedrock player. Not an error.
  bedrock: "Bedrock player",
  // Nothing to replace, so the confirm step drops its "older versions" line.
  freshInstall: "Confirm (nothing stale)",
  // Four mods, to check the confirm step's counts and list.
  manyMods: "Confirm (four mods)",
  // Two mods each pulling in a dependency, so the supporting files group.
  manyDependencies: "Confirm (grouped supporting files)",
  // Detection itself failed - no Discord buttons, they can't help us.
  minecraftFailure: "Failed (no Minecraft)",
  // Our fault, so the failed screen offers Discord and Open Logs.
  ourFailure: "Failed (asks for contact)",
  // Their connection, so no contact buttons.
  offline: "Failed (offline)",
} as const;

export type Scenario = keyof typeof SCENARIOS;

// Read at call time by every mock.
let active: Scenario = "default";

export function currentScenario(): Scenario {
  return active;
}

export function setScenario(scenario: Scenario) {
  active = scenario;
}
