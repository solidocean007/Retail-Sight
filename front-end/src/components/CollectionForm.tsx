// CollectionForm.tsx
import React, { useState } from "react";
import { Box, Modal } from "@mui/material";
import { CreateCollectionInput } from "../utils/types";
import "./collectionForm.css";

interface CollectionFormProps {
  isOpen: boolean;
  onAddCollection: (newCollection: CreateCollectionInput) => Promise<void>;
  onClose: () => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({
  isOpen,
  onAddCollection,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onAddCollection({
        title: trimmedTitle,
        description: trimmedDescription,
        postIds: [],
        previewImages: [],
        sharedWith: [],
        isShareableOutsideCompany: false,
        collectionType: "collection",
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating collection:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="collection-modal-title"
      aria-describedby="collection-modal-description"
    >
      <Box
        className="collection-form-modal"
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 420px)",
          bgcolor: "background.paper",
          borderRadius: "12px",
          boxShadow: 24,
          p: 3,
        }}
      >
        <form className="collection-form" onSubmit={handleSubmit}>
          <h3 id="collection-modal-title">Create Collection</h3>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Collection Name"
            required
            autoFocus
          />

          <textarea
            id="collection-modal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={4}
          />

          <div className="collection-form-actions">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className={!title.trim() || isSubmitting ? "disabled-button" : ""}
            >
              {isSubmitting ? "Creating..." : "Add Collection"}
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

export default CollectionForm;