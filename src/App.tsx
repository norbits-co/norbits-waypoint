import { useState } from "react";

import type { Scenario } from "./api/scenarios";
import { ScenarioPicker } from "./components/ScenarioPicker";
import { TitleBar } from "./components/TitleBar";
import { useStartup } from "./hooks/useStartup";
import { useTheme } from "./hooks/useTheme";
import { BedrockScreen } from "./screens/BedrockScreen";
import { ConfirmScreen } from "./screens/ConfirmScreen";
import { FailedScreen } from "./screens/FailedScreen";
import { FoundScreen } from "./screens/FoundScreen";
import { SearchingScreen } from "./screens/SearchingScreen";

const IS_MOCK = import.meta.env.VITE_MOCK === "1";

// The state machine, and which screen it means. Screens take plain props.
function Flow() {
  const { status, plan, cancelPlan } = useStartup();

  return (
    <main className="bg-wp-body grid flex-1 place-items-center p-10">
      {status.kind === "searching" && <SearchingScreen />}

      {status.kind === "found" && <FoundScreen onSetUp={() => plan(status.dir, status.manifest)} />}

      {status.kind === "confirm" && (
        <ConfirmScreen
          plan={status.plan}
          onInstall={() => {}}
          onCancel={() => cancelPlan(status.dir, status.manifest)}
        />
      )}

      {status.kind === "bedrock" && <BedrockScreen address={status.manifest.server.address} />}

      {status.kind === "failed" && <FailedScreen message={status.message} />}
    </main>
  );
}

function App() {
  const { theme, toggle } = useTheme();

  // Mock only. Changing this remounts Flow, which re-runs startup against the new scenario
  const [scenario, setScenario] = useState<Scenario>("default");

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <TitleBar theme={theme} onToggleTheme={toggle} />

      <Flow key={IS_MOCK ? scenario : undefined} />

      {IS_MOCK && <ScenarioPicker value={scenario} onChange={setScenario} />}
    </div>
  );
}

export default App;
