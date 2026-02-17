// DebugValues.tsx
import React from "react";

interface DebugValuesProps {
  userRoute?: string;
  galloEnabled: boolean;
  isAllStoresShown: boolean;
  allGalloGoalsCount: number;
  usersGalloGoalsCount: number;
  usersActiveGalloGoalsCount: number;
  allActiveGalloGoalsCount: number;
  finalDropdownCount: number;
  selectedAccountNumber?: string;
}

const DebugValues: React.FC<DebugValuesProps> = ({
  userRoute,
  galloEnabled,
  isAllStoresShown,
  allGalloGoalsCount,
  usersGalloGoalsCount,
  usersActiveGalloGoalsCount,
  allActiveGalloGoalsCount,
  finalDropdownCount,
  selectedAccountNumber,
}) => {
  return (
    <div
      style={{
        background: "#111",
        color: "#0f0",
        padding: "12px",
        margin: "12px 0",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "monospace",
      }}
    >
      <h4>Temporary Debug Panel</h4>
      <div>Route: {userRoute ?? "undefined"}</div>
      <div>Gallo Enabled: {String(galloEnabled)}</div>
      <div>All Stores Mode: {String(isAllStoresShown)}</div>
      <div>Selected Account: {selectedAccountNumber ?? "none"}</div>
      <hr />
      <div>All Gallo Goals: {allGalloGoalsCount}</div>
      <div>User Gallo Goals: {usersGalloGoalsCount}</div>
      <div>
        User Active Goals (account filtered): {usersActiveGalloGoalsCount}
      </div>
      <div>All Active Goals (account filtered): {allActiveGalloGoalsCount}</div>
      <hr />
      <div>Final Dropdown Goals: {finalDropdownCount}</div>
    </div>
  );
};

export default DebugValues;
