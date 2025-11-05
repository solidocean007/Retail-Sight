// CollectionForm.tsx
import React, { useState } from "react";
import { CollectionType } from "../utils/types";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./collectionForm.css";
import { Box, Modal } from "@mui/material";

interface CollectionFormProps {
  isOpen: boolean;
  onAddCollection: (newCollection: CollectionType) => Promise<void>;
  onClose: () => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({
  isOpen,
  onAddCollection,
  onClose,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const user = useSelector(selectUser);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!name.trim()) {
      e.preventDefault();
      // Optionally show an error message to the user here
      return;
    }
    e.preventDefault();
    if (user && user.uid) {
      onAddCollection({
        name,
        description,
        ownerId: user.uid,
        posts: [],
        sharedWith: [],
        isShareableOutsideCompany: true,
      });
      setName("");
      setDescription("");
      onClose();
    } else {
      console.error("User not defined.");
    }
  };

  // You may want to also call onClose when the user decides not to proceed
  const handleCancel = () => {
    onClose(); // Call the onClose prop function
  };
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          border: "2px solid #000",
          boxShadow: 24,
          p: 4,
        }}
      >
        <form className="collection-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection Name"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            // how can i let a user hit use the enter button like a submit button if there is also a value in the input above?
          />
          <button
            type="submit"
            className={!name.trim() ? "disabled-button" : ""}
          >
            Add Collection
          </button>
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
        </form>
      </Box>
    </Modal>
  );
};

export default CollectionForm;
