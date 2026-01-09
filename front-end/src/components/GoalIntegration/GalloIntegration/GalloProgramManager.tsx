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
  const [pages, setPages] = useState<Record<string, number>>({
    recent: 1,
    activeUnimported: 1,
    activeImported: 1,
    expired: 1,
  });

  const grouped = useMemo(() => {
    const filtered = programs.filter((p) =>
      p.programTitle.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort(
      (a, b) => getCreatedAtMs(b) - getCreatedAtMs(a)
    );

    const active = sorted.filter((p) => p.status === "active");
    const expired = sorted.filter((p) => p.status === "expired");

    const activeUnimported = active.filter(
      (p) => !importedProgramIds.has(p.programId)
    );

    const activeImported = active.filter((p) =>
      importedProgramIds.has(p.programId)
    );

    const recent = activeUnimported.filter(isRecent);

    return {
      recent,
      activeUnimported: activeUnimported.filter((p) => !isRecent(p)),
      activeImported,
      expired,
    };
  }, [programs, importedProgramIds, search]);

  const renderGroup = (key: keyof typeof grouped, label: string) => {
    if (!grouped[key].length) return null;

    const visible = grouped[key].slice(0, pages[key] * PAGE_SIZE);

    return (
      <section className="program-group">
        <button
          className="group-header"
          onClick={() => setExpanded((e) => ({ ...e, [key]: !e[key] }))}
        >
          <span className="caret">{expanded[key] ? "▼" : "▶"}</span>
          <span className="group-label">{label}</span>
          <span
            className={`group-count ${
              key === "activeUnimported" ? "count-action" : ""
            }`}
          >
            ({grouped[key].length})
          </span>
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
                    <div className="program-header-left">
                      <div className="program-title">{p.programTitle}</div>
                    </div>

                    <div className="program-header-right">
                      {!imported && (
                        <div className="import-state not-imported">
                          <span>NOT</span>
                          <span>IMPORTED</span>
                        </div>
                      )}

                      {imported && (
                        <span className="badge badge-imported">
                          🟢 Imported
                        </span>
                      )}

                      {isRecent(p) && (
                        <span className="badge badge-new">New</span>
                      )}
                    </div>
                  </div>

                  <div className="program-meta">
                    <div>
                      <strong>Market:</strong> {p.marketId}
                    </div>
                    <div className="muted">Program ID: {p.programId}</div>

                    {p.status === "expired" && (
                      <div>
                        <span className={`pill ${p.status}`}>{p.status}</span>
                      </div>
                    )}
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
                onClick={() => setPages((p) => ({ ...p, [key]: p[key] + 1 }))}
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
          setPages({
            recent: 1,
            activeUnimported: 1,
            activeImported: 1,
            expired: 1,
          });
        }}
      />

      <p className="integration-note">
        Programs sourced from Gallo Axis ({selectedEnv?.toUpperCase() ?? "N/A"})
      </p>

      {renderGroup("recent", "Recently Added")}
      {renderGroup("activeUnimported", "Active – Not Imported")}
      {renderGroup("activeImported", "Active – Imported")}
      {renderGroup("expired", "Expired")}
    </div>
  );
};

export default GalloProgramManager;
