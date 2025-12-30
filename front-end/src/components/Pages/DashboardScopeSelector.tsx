import { DashboardModeType } from "../../utils/types";
import "./dashboardScopeSelector.css";


// DashboardScopeSelector.tsx
interface ScopeOption {
  label: string;
  mode: DashboardModeType;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  { label: "Company Goals", mode: "GoalManagerMode" },
  { label: "My Goals", mode: "MyGoalsMode" },
  { label: "Gallo Programs & Goals", mode: "GoalManagerMode" }, // same mode, internal tab
];

export function DashboardScopeSelector({
  value,
  onChange,
}: {
  value: DashboardModeType;
  onChange: (mode: DashboardModeType) => void;
}) {
  return (
    <select
      className="dashboard-scope-select"
      value={value}
      onChange={(e) => onChange(e.target.value as DashboardModeType)}
    >
      {SCOPE_OPTIONS.map((o) => (
        <option key={o.mode} value={o.mode}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
