import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LiquorRoundedIcon from "@mui/icons-material/LiquorRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import WineBarRoundedIcon from "@mui/icons-material/WineBarRounded";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { useEffect, useState } from "react";

import type { GoalSource } from "./AllGoalsLayout";
import CreateCompanyGoalView from "./CreateCompanyGoalView";
import GalloGoalImporter from "./GalloIntegration/GalloGoalImporter";

import "./allGoalsLayout.css";

type CreateGoalsLayoutProps = {
  open: boolean;
  onClose: () => void;
  galloEnabled: boolean;
  initialSource: GoalSource;
};

const CreateGoalsLayout = ({
  open,
  onClose,
  galloEnabled,
  initialSource,
}: CreateGoalsLayoutProps) => {
  const [source, setSource] = useState<GoalSource>("company");

  useEffect(() => {
    if (!galloEnabled && source === "gallo") {
      setSource("company");
    }
  }, [galloEnabled, source]);

  useEffect(() => {
    if (open) {
      setSource(
        initialSource === "gallo" && galloEnabled ? "gallo" : "company",
      );
    }
  }, [galloEnabled, initialSource, open]);

  const creatingGalloGoal = source === "gallo" && galloEnabled;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="create-goal-dialog-title"
      className="goal-create-dialog"
      PaperProps={{ className: "goal-create-dialog__paper" }}
    >
      <DialogTitle
        id="create-goal-dialog-title"
        className="goal-create-dialog__title"
      >
        <div>
          <span>
            {creatingGalloGoal
              ? "Import a Gallo Axis goal"
              : "Create a company goal"}
          </span>
          <small>
            {creatingGalloGoal
              ? "Use the existing Gallo Axis import workflow."
              : "Build the goal in a few focused steps."}
          </small>
        </div>
        <IconButton aria-label="Close goal creator" onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="goal-create-dialog__content">
        <section className="all-goals">
          {galloEnabled && (
            <div
              className="goal-create-source-switcher"
              role="tablist"
              aria-label="Goal creation source"
            >
              <button
                type="button"
                role="tab"
                aria-selected={source === "company"}
                className={`goal-create-source-btn ${
                  source === "company" ? "active" : ""
                }`}
                onClick={() => setSource("company")}
              >
                <TrackChangesRoundedIcon aria-hidden="true" />
                Company goal
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={source === "gallo"}
                className={`goal-create-source-btn external ${
                  source === "gallo" ? "active" : ""
                }`}
                onClick={() => setSource("gallo")}
              >
                <span
                  className="goal-create-source-btn__icons"
                  aria-hidden="true"
                >
                  <WineBarRoundedIcon />
                  <LiquorRoundedIcon />
                </span>
                Gallo Axis import
                <span className="external-badge">Integrated</span>
              </button>
            </div>
          )}

          <div className={`goals-view ${source}`}>
            {source === "company" ? (
              <CreateCompanyGoalView onCancel={onClose} onCreated={onClose} />
            ) : (
              galloEnabled && <GalloGoalImporter setValue={() => undefined} />
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGoalsLayout;
