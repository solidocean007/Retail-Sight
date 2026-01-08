import { useMemo, useState } from "react";
import { GalloProgramType } from "../../../utils/types";
import { EnrichedGalloProgram } from "./GalloGoalImporter";
import "./galloProgramManager.css";

interface Props {
  selectedEnv: "prod" | "dev" | null;
  programs: EnrichedGalloProgram[];
  importedProgramIds: Set<string>;
  selectedProgram: GalloProgramType | null;
  onSelectProgram: (program: GalloProgramType | null) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 15;

const getCreatedAtMs = (p: EnrichedGalloProgram) => {
  if (typeof p.__debug?.startDateUnix === "number") {
    return p.__debug.startDateUnix * 1000;
  }
  const parsed = Date.parse(p.startDate);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const isRecent = (p: EnrichedGalloProgram) =>
  Date.now() - getCreatedAtMs(p) < DAY_MS;

const GalloProgramManager: React.FC<Props> = ({
  selectedEnv,
  programs,
  importedProgramIds,
  selectedProgram,
  onSelectProgram,
}) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({
    recent: true,
    activeUnimported: true,
    activeImported: false,
    expired: false,
  });
  const [page, setPage] = useState(1);

  const grouped = useMemo(() => {
    const filtered = programs.filter((p) =>
      p.programTitle.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort(
      (a, b) => getCreatedAtMs(b) - getCreatedAtMs(a)
    );

    return {
      recent: sorted.filter(isRecent),
      activeUnimported: sorted.filter(
        (p) => p.status === "active" && !importedProgramIds.has(p.programId)
      ),
      activeImported: sorted.filter(
        (p) => p.status === "active" && importedProgramIds.has(p.programId)
      ),
      expired: sorted.filter((p) => p.status === "expired"),
    };
  }, [programs, importedProgramIds, search]);

  const renderGroup = (
    key: keyof typeof grouped,
    label: string
  ) => {
    if (!grouped[key].length) return null;

    const visible = grouped[key].slice(0, page * PAGE_SIZE);

    return (
      <section className="program-group">
        <button
          className="group-header"
          onClick={() =>
            setExpanded((e) => ({ ...e, [key]: !e[key] }))
          }
        >
          {expanded[key] ? "▼" : "▶"} {label} ({grouped[key].length})
        </button>

        {expanded[key] && (
          <div className="program-list">
            {visible.map((p) => {
              const selected = selectedProgram?.programId === p.programId;
              const imported = importedProgramIds.has(p.programId);

              return (
                <div
                  key={p.programId}
                  className={`program-card ${selected ? "selected" : ""}`}
                  onClick={() => onSelectProgram(selected ? null : p)}
                >
                  <div className="program-card-header">
                    <div className="program-title">{p.programTitle}</div>
                    <div className="program-badges">
                      {isRecent(p) && (
                        <span className="badge badge-new">New</span>
                      )}
                      {imported && (
                        <span className="badge badge-imported">
                          Imported
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="program-meta">
                    <div>
                      <strong>Market:</strong> {p.marketId}
                    </div>
                    <div>
                      <span className={`pill ${p.status}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  <div className="program-dates">
                    <div>Start: {p.startDate}</div>
                    <div>End: {p.endDate}</div>
                  </div>
                </div>
              );
            })}

            {visible.length < grouped[key].length && (
              <button
                className="button-outline"
                onClick={() => setPage((p) => p + 1)}
              >
                Load more
              </button>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="gallo-program-manager">
      <input
        className="gallo-program-search"
        placeholder="Search programs…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <p className="integration-note">
        Programs sourced from Gallo Axis (
        {selectedEnv?.toUpperCase() ?? "N/A"})
      </p>

      {renderGroup("recent", "Recently Added")}
      {renderGroup("activeUnimported", "Active – Not Imported")}
      {renderGroup("activeImported", "Active – Imported")}
      {renderGroup("expired", "Expired")}
    </div>
  );
};

export default GalloProgramManager;
