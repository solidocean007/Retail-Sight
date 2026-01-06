// components/Gallo/GalloProgramImportCard.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  Button,
} from "@mui/material";
import { GalloGoalType, GalloProgramType } from "../../../utils/types";
import "./galloProgramImportCard.css";
import { KeyStatusType } from "./GalloGoalImporter";
import { getFunctions, httpsCallable } from "firebase/functions";
import dayjs from "dayjs";
import { isProgramExpired } from "../utils/galloProgramGoalsHelpers";

type EnrichedGalloProgram = GalloProgramType & {
  __debug?: {
    hasMarketId: boolean;
    startDateUnix?: number;
    endDateUnix?: number;
    rawKeys: string[];
  };
};

interface Props {
  env: "prod" | "dev" | null;
  hasFetchedGoals: boolean;
  keyStatus: KeyStatusType | null;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedGoal: React.Dispatch<React.SetStateAction<GalloGoalType | null>>;
  setGoals: React.Dispatch<React.SetStateAction<GalloGoalType[]>>;
  selectedProgram: EnrichedGalloProgram;
  alreadyImported?: boolean;
  selected: boolean;
  disabled?: boolean;
  expired: boolean;
  onToggle: () => void;
}

const GalloProgramImportCard: React.FC<Props> = ({
  env,
  hasFetchedGoals,
  keyStatus,
  setIsLoading,
  setSelectedGoal,
  setGoals,
  selectedProgram,
  alreadyImported,
  selected,
  disabled,
  expired,
  onToggle,
}) => {
  const [showDebug, setShowDebug] = useState(false);
  const functions = getFunctions();
  console.log("from gallo program import card: ", selectedProgram);
  const fetchGoals = async () => {
    if (!env) return;
    if (!selectedProgram || hasFetchedGoals) return;
    if (!keyStatus?.[env]?.exists) {
      alert(`No ${env.toUpperCase()} key configured`);
      return;
    }
    if (!selectedProgram) return;
    setIsLoading(true);

    try {
      const fetchGoalsCF = httpsCallable(functions, "galloFetchGoals");
      console.log(env, selectedProgram.programId, selectedProgram.marketId);
      const res = await fetchGoalsCF({
        env: env, // MUST be "env"
        programId: selectedProgram.programId,
        marketId: selectedProgram.marketId,
      });

      const goals = res.data as GalloGoalType[];
      console.log("Fetched goals:", res);
      setGoals(goals);
      setSelectedGoal(null);
      setEnrichedAccounts([]); // not sure if i need this here
      setUnmatchedAccounts([]); // not sure if i need this here
    } catch (err) {
      console.error("Error fetching goals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <div className={`gallo-program-card ${selected ? "selected" : ""}`}>
      {/* Header */}
      {alreadyImported && (
        <span className="program-badge program-badge--imported">
          Already Imported
        </span>
      )}

      <div className="gallo-program-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Checkbox
            checked={selected}
            onChange={() => onToggle()}
            disabled={disabled}
          />

          <span className="gallo-program-title">
            {selectedProgram.programTitle}
          </span>
        </div>
        <span className="gallo-program-chip">
          {selectedProgram.programType ?? "Unknown Type"}
        </span>
      </div>

      {/* Core metadata */}
      <div className="gallo-program-meta">
        <span className="gallo-program-chip">
          Market: {selectedProgram.marketId}
        </span>
        <span className="gallo-program-chip">
          Start: {selectedProgram.startDate}
        </span>

        <span
          className={`gallo-program-chip ${
            expired ? "gallo-program-chip--ended" : ""
          }`}
        >
          End: {selectedProgram.endDate}
        </span>

        <span className="gallo-program-chip">
          Priority: {selectedProgram.priority}
        </span>
        <span className="gallo-program-chip">
          Sales: {selectedProgram.salesType}
        </span>
      </div>

      {/* Description */}
      {selectedProgram.programDesc && (
        <div className="gallo-program-desc">{selectedProgram.programDesc}</div>
      )}

      <Divider sx={{ my: 1 }} />

      {/* Debug toggle */}
      {selectedProgram.__debug && (
        <>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowDebug((v) => !v)}
          >
            {showDebug ? "Hide Raw Data" : "Show Raw Data"}
          </Button>

          <Collapse in={showDebug}>
            {showDebug && (
              <div className="gallo-debug-panel">
                <pre>{JSON.stringify(selectedProgram, null, 2)}</pre>
              </div>
            )}
          </Collapse>
        </>
      )}
      <div>
        {selectedProgram &&
          !isProgramExpired(selectedProgram) &&
          goals.length === 0 &&
          !isLoading && <button onClick={fetchGoals}>Fetch Goals</button>}
      </div>
    </div>
  );
};

export default GalloProgramImportCard;
