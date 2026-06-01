// src/components/Playbooks/PlaybookForm.tsx
import React, { useState } from "react";
import { Box, Modal } from "@mui/material";
import { CreateCollectionInput } from "../../utils/types";
import "./playbookForm.css";

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
  const [executionGoal, setExecutionGoal] = useState("");
  const [whenToUse, setWhenToUse] = useState("");
  const [managerNotes, setManagerNotes] = useState("");
  const [audience, setAudience] = useState<"sales" | "supervisors" | "all">(
    "sales",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setExecutionGoal("");
    setWhenToUse("");
    setManagerNotes("");
    setAudience("sales");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onAddPlaybook({
        title: trimmedTitle,
        description: description.trim(),
        postIds: [],
        previewImages: [],
        sharedWith: [],
        isShareableOutsideCompany: false,

        collectionType: "playbook",
        playbookStatus: "draft",
        executionGoal: executionGoal.trim(),
        whenToUse: whenToUse.trim(),
        managerNotes: managerNotes.trim(),
        audience,
        featuredPostIds: [],
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

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Playbook Name"
            required
            autoFocus
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={3}
          />

          <input
            type="text"
            value={whenToUse}
            onChange={(e) => setWhenToUse(e.target.value)}
            placeholder="When to use this? Example: Halloween, AP5, Summer reset"
          />

          <textarea
            value={executionGoal}
            onChange={(e) => setExecutionGoal(e.target.value)}
            placeholder="Execution goal. Example: Help reps build from proven displays."
            rows={3}
          />

          <textarea
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            placeholder="Manager notes for the team"
            rows={4}
          />

          <select
            title="audience"
            value={audience}
            onChange={(e) =>
              setAudience(e.target.value as "sales" | "supervisors" | "all")
            }
          >
            <option value="sales">Sales Team</option>
            <option value="supervisors">Supervisors</option>
            <option value="all">All Team Members</option>
          </select>

          <div className="playbook-form-actions">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className={!title.trim() || isSubmitting ? "disabled-button" : ""}
            >
              {isSubmitting ? "Creating..." : "Create Playbook"}
            </button>

            <button type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
          </div>
        </form>
      </Box>
    </Modal>
  );
};

export default PlaybookForm;
