import { TitleBar } from "./components/TitleBar";
import { useStartup } from "./hooks/useStartup";
import { useTheme } from "./hooks/useTheme";
import { BedrockScreen } from "./screens/BedrockScreen";
import { ConfirmScreen } from "./screens/ConfirmScreen";
import { FailedScreen } from "./screens/FailedScreen";
import { FoundScreen } from "./screens/FoundScreen";
import { SearchingScreen } from "./screens/SearchingScreen";

// Holds the state machine and picks a screen. Screens take plain props
function App() {
  const { theme, toggle } = useTheme();
  const { status, plan, cancelPlan } = useStartup();

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <TitleBar theme={theme} onToggleTheme={toggle} />

      <main className="bg-wp-body grid flex-1 place-items-center p-10">
        {status.kind === "searching" && <SearchingScreen />}

        {status.kind === "found" && (
          <FoundScreen onSetUp={() => plan(status.dir, status.manifest)} />
        )}

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
    </div>
  );
}

export default App;
