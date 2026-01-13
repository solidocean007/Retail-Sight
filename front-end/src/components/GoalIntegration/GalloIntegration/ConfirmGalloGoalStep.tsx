import { useEffect, useState } from "react";
import {
  EnrichedGalloAccountType,
  GalloGoalType,
  GalloProgramType,
} from "../../../utils/types";
import "./confirmGalloGoalStep.css";

interface Props {
  program: GalloProgramType | null;
  goal: GalloGoalType | null;
  allAccounts: EnrichedGalloAccountType[];
  selectedAccounts: EnrichedGalloAccountType[];
  notifyUserIds: string[];
  onBack: () => void;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const ConfirmGalloGoalStep: React.FC<Props> = ({
  program,
  goal,
  allAccounts,
  selectedAccounts,
  notifyUserIds,
  onBack,
  onConfirm,
  onClose,
}) => {
  const activeCount = selectedAccounts.length;
  const totalCount = allAccounts.length;

  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle"
  );
  console.log(notifyUserIds);
  const handleConfirm = async () => {
    setStatus("saving");
    try {
      await onConfirm();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(onClose, 3600);
      return () => clearTimeout(t);
    }
  }, [status, onClose]);

  return (
    <section className="confirm-step">
      {status === "success" ? (
        <div className="confirm-success">
          <h3>✅ Goal Created</h3>
          <p>Your Gallo goal was successfully created.</p>

          <button className="button-primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <>
          <h3 className="confirm-title">Confirm Goal Creation</h3>

          <p className="confirm-intro">
            You are about to create a <strong>Gallo goal</strong>.
          </p>

          <div className="confirm-summary">
            <div>
              <span className="label">Goal</span>
              <span>{goal?.goal ?? "—"}</span>
            </div>

            <div>
              <span className="label">Accounts</span>
              <span>
                {activeCount} active / {totalCount} total
              </span>
            </div>

            <div className="confirm-note">
              {notifyUserIds.length === 0
                ? "No email notifications will be sent."
                : `${notifyUserIds.length} user(s) will be notified by email.`}
            </div>
          </div>

          <div className="confirm-actions">
            <button
              className="btn-secondary"
              onClick={onBack}
              disabled={status === "saving"}
            >
              ← Back
            </button>

            <button
              className="button-primary"
              disabled={status === "saving"}
              onClick={handleConfirm}
            >
              {status === "saving" ? "Creating…" : "Confirm & Create Goal"}
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default ConfirmGalloGoalStep;
