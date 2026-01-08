// components/Gallo/GalloProgramImportCard.tsx
import React, { useState } from "react";
import { Typography, Collapse, Divider, Button } from "@mui/material";
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
  alreadyImported: boolean;
  expired: boolean;
  canFetchGoals: boolean;
  isLoading: boolean;
  onFetchGoals: () => Promise<void>;
}

const GalloProgramImportCard: React.FC<Props> = ({
  program,
  alreadyImported,
  expired,
  canFetchGoals,
  isLoading,
  onFetchGoals,
}) => {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="gallo-program-card selected">
      {/* Badges */}
      {alreadyImported && (
        <span className="program-badge program-badge--imported">
          Already Imported
        </span>
      )}

      {expired && (
        <span className="program-badge program-badge--expired">
          Program Ended
        </span>
      )}

      {/* Header */}
      <div className="gallo-program-header">
        <span className="gallo-program-title">{program.programTitle}</span>

        <span className="gallo-program-chip">
          {program.programType ?? "Unknown Type"}
        </span>
      </div>

      {/* Meta */}
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

      {/* Actions */}
      {canFetchGoals && (
        <button
          className="button-primary"
          disabled={isLoading}
          onClick={onFetchGoals}
        >
          {isLoading ? "Fetching…" : "Fetch Goals"}
        </button>
      )}

      {!canFetchGoals && !expired && (
        <Typography variant="caption" color="text.secondary">
          Goals already loaded for this program.
        </Typography>
      )}

      {/* Debug */}
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
            <div className="gallo-debug-panel">
              <pre>{JSON.stringify(program, null, 2)}</pre>
            </div>
          </Collapse>
        </>
      )}
    </div>
  );
};

export default GalloProgramImportCard;
