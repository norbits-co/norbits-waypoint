import { SCENARIOS, setScenario, type Scenario } from "../api/scenarios";

type Props = {
  value: Scenario;
  onChange: (scenario: Scenario) => void;
};

// A corner dropdown for flipping the mock backend between states.
export function ScenarioPicker({ value, onChange }: Props) {
  return (
    <label className="border-wp-panel-border bg-wp-panel fixed right-3 bottom-3 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] opacity-60 transition-opacity hover:opacity-100">
      <span className="text-wp-muted tracking-wide uppercase">Mock</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value as Scenario;
          // The mocks read this when called.
          setScenario(next);
          onChange(next);
        }}
        className="text-wp-title bg-wp-panel cursor-pointer border-0 text-[12px] outline-none"
        aria-label="Mock scenario"
      >
        {Object.entries(SCENARIOS).map(([key, label]) => (
          <option key={key} value={key} className="bg-wp-panel text-wp-title">
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
