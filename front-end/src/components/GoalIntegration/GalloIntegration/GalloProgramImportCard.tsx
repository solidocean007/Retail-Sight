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
import { GalloProgramType } from "../../../utils/types";
import "./galloProgramImportCard.css";

type EnrichedGalloProgram = GalloProgramType & {
  __debug?: {
    hasMarketId: boolean;
    startDateUnix?: number;
    endDateUnix?: number;
    rawKeys: string[];
  };
};

interface Props {
  program: EnrichedGalloProgram;
  alreadyImported?: boolean;
  selected: boolean;
  disabled?: boolean;
  expired: boolean;
  onToggle: () => void;
}

const GalloProgramImportCard: React.FC<Props> = ({
  program,
  alreadyImported,
  selected,
  disabled,
  expired,
  onToggle,
}) => {
  const [showDebug, setShowDebug] = useState(false);
  console.log("from gallo program import card: ", program);
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

          <span className="gallo-program-title">{program.programTitle}</span>
        </div>
        <span className="gallo-program-chip">
          {program.programType ?? "Unknown Type"}
        </span>
      </div>

      {/* Core metadata */}
      <div className="gallo-program-meta">
        <span className="gallo-program-chip">Market: {program.marketId}</span>
        <span className="gallo-program-chip">Start: {program.startDate}</span>

        <span
          className={`gallo-program-chip ${
            expired ? "gallo-program-chip--ended" : ""
          }`}
        >
          End: {program.endDate}
        </span>

        <span className="gallo-program-chip">Priority: {program.priority}</span>
        <span className="gallo-program-chip">Sales: {program.salesType}</span>
      </div>

      {/* Description */}
      {program.programDesc && (
        <div className="gallo-program-desc">{program.programDesc}</div>
      )}

      <Divider sx={{ my: 1 }} />

      {/* Debug toggle */}
      {program.__debug && (
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
                <pre>{JSON.stringify(program, null, 2)}</pre>
              </div>
            )}
          </Collapse>
        </>
      )}
    </div>
  );
};

export default GalloProgramImportCard;
