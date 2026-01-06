// components/Gallo/GalloProgramManager.tsx
import { GalloProgramType } from "../../../utils/types";
import { EnrichedGalloProgram } from "./GalloGoalImporter";
import "./galloProgramManager.css";

interface GalloProgramManagerProps {
  selectedEnv: "prod" | "dev" | null;
  programs: EnrichedGalloProgram[];
  importedProgramIds: Set<string>;
  selectedProgram: GalloProgramType | null;
  onSelectProgram: (program: GalloProgramType | null) => void;
}

const GalloProgramManager: React.FC<GalloProgramManagerProps> = ({
  selectedEnv,
  programs,
  importedProgramIds,
  selectedProgram,
  onSelectProgram,
}) => {
  return (
    <div className="gallo-program-manager">
      <p className="integration-note">
        Goals created here are imported from Gallo Axis programs and are managed
        externally. Source: Gallo Axis (
        {(selectedEnv && selectedEnv.toUpperCase()) || "N/A"})
      </p>
      <table className="program-table">
        <thead>
          <tr>
            <th>Program</th>
            <th>Market</th>
            <th>Status</th>
            <th>Start</th>
            <th>End</th>
            <th>Imported</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => {
            const isSelected = selectedProgram?.programId === p.programId;

            return (
              <tr
                key={p.programId}
                className={
                  selectedProgram?.programId === p.programId ? "selected" : ""
                }
                onClick={() =>
                  onSelectProgram(
                    selectedProgram?.programId === p.programId ? null : p
                  )
                }
              >
                <td>{p.programTitle}</td>
                <td>{p.marketId}</td>
                <td>
                  <span className={`pill ${p.status}`}>{p.status}</span>
                </td>
                <td>{p.startDate}</td>
                <td>{p.endDate}</td>
                <td>{importedProgramIds.has(p.programId) ? "✅" : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default GalloProgramManager;
