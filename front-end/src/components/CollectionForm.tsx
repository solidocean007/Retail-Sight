import { useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";

import { CreateCollectionInput } from "../utils/types";

import "./collectionForm.css";

type CollectionFormProps = {
  isOpen: boolean;
  onAddCollection: (newCollection: CreateCollectionInput) => Promise<void>;
  onClose: () => void;
};

const CollectionForm = ({
  isOpen,
  onAddCollection,
  onClose,
}: CollectionFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddCollection({
        name: trimmedName,
        description: description.trim(),
        posts: [],
        previewImages: [],
        sharedWith: [],
        isShareableOutsideCompany: false,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating collection:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: "collection-form-dialog" }}
      aria-labelledby="collection-modal-title"
    >
      <form className="collection-form" onSubmit={handleSubmit}>
        <DialogTitle
          className="collection-form__title"
          id="collection-modal-title"
        >
          <span className="collection-form__mark" aria-hidden="true">
            <CollectionsBookmarkOutlinedIcon />
          </span>
          <span>
            <strong>Create collection</strong>
            <small>Start a focused set of displays to revisit or share.</small>
          </span>
          <IconButton
            className="collection-form__close"
            aria-label="Close create collection dialog"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent className="collection-form__content">
          <TextField
            label="Collection name"
            placeholder="Example: Fall reset inspiration"
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputProps={{ maxLength: 80 }}
            autoFocus
            fullWidth
            required
          />
          <div className="collection-form__field-note">
            <span>
              Give the collection a recognizable project or account name.
            </span>
            <span>{name.length}/80</span>
          </div>

          <TextField
            label="Description"
            placeholder="What belongs in this collection?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            inputProps={{ maxLength: 240 }}
            minRows={3}
            multiline
            fullWidth
          />
          <div className="collection-form__field-note">
            <span>
              Optional. This is visible to anyone who can view the collection.
            </span>
            <span>{description.length}/240</span>
          </div>
        </DialogContent>

        <DialogActions className="collection-form__actions">
          <Button variant="text" disabled={isSubmitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim() || isSubmitting}
            startIcon={
              isSubmitting ? <CircularProgress size={15} /> : undefined
            }
          >
            {isSubmitting ? "Creating" : "Create collection"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CollectionForm;
