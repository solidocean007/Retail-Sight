// src/components/Playbooks/PlaybookForm.tsx
import React, { useState } from "react";
import { Box, Modal } from "@mui/material";
import "./playbookForm.css";
import { CreateCollectionInput, PlaybookAudience } from "../../types/library";

interface PlaybookFormProps {
  isOpen: boolean;
  onAddPlaybook: (newPlaybook: CreateCollectionInput) => Promise<void>;
  onClose: () => void;
}

const PlaybookForm: React.FC<PlaybookFormProps> = ({
  isOpen,
  onAddPlaybook,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gamePlan, setGamePlan] = useState("");
  const [executionGoal, setExecutionGoal] = useState("");
  const [whenToUse, setWhenToUse] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [audience, setAudience] = useState<PlaybookAudience>("sales");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setGamePlan("");
    setExecutionGoal("");
    setWhenToUse("");
    setCoachNotes("");
    setAudience("sales");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const clean = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onAddPlaybook({
        title: trimmedTitle,
        description: clean(description),

        postIds: [],
        previewImages: [],
        sharedWith: [],
        isShareableOutsideCompany: false,

        collectionType: "playbook",
        playbookStatus: "draft",

        gamePlan: clean(gamePlan),
        executionGoal: clean(executionGoal),
        whenToUse: clean(whenToUse),
        coachNotes: clean(coachNotes),
        audience,

        featuredPostIds: [],
        playbookPostSnapshots: [],
        featuredPostSnapshots: [],
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating playbook:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Box className="playbook-form-modal">
        <form className="playbook-form" onSubmit={handleSubmit}>
          <h3>Create Playbook</h3>

          <p className="playbook-form-subtitle">
            Build a game plan from displays that worked before.
          </p>
          <div className="playbook-form-inputs">
            <label>
              Playbook Name
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: Halloween Display Game Plan"
                required
                autoFocus
              />
            </label>

            <label>
              Short Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quick summary of what this playbook is for."
                rows={3}
              />
            </label>

            <label>
              When to Use
              <input
                type="text"
                value={whenToUse}
                onChange={(e) => setWhenToUse(e.target.value)}
                placeholder="Example: Halloween, AP5, summer reset, chain display push"
              />
            </label>

            <label>
              Game Plan
              <textarea
                name="gamePlan"
                value={gamePlan}
                onChange={(e) => setGamePlan(e.target.value)}
                placeholder="Explain the overall strategy. Example: Use proven lobby and endcap displays as starting points for seasonal execution."
                rows={3}
              />
            </label>

            <label>
              Execution Goal
              <textarea
                value={executionGoal}
                onChange={(e) => setExecutionGoal(e.target.value)}
                placeholder="What should the team accomplish? Example: Secure one incremental display in priority accounts."
                rows={3}
              />
            </label>

            <label>
              Coach&apos;s Notes
              <textarea
                name="coachNotes"
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Add guidance for the team. Example: Focus on clean brand blocking, visible pricing, and seasonal tie-ins."
                rows={4}
              />
            </label>

            <label>
              Team
              <select
                title="audience"
                value={audience}
                onChange={(e) =>
                  setAudience(e.target.value as PlaybookAudience)
                }
              >
                <option value="sales">Sales Team</option>
                <option value="supervisors">Supervisors</option>
                <option value="all">All Team Members</option>
              </select>
            </label>
            <div className="playbook-form-actions">
              <button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className={
                  !title.trim() || isSubmitting ? "disabled-button" : ""
                }
              >
                {isSubmitting ? "Creating..." : "Create Draft Playbook"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </Box>
    </Modal>
  );
};

export default PlaybookForm;
