import React from "react";
import {
  Modal,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import "./linkShareModal.css";

// Styles for the modal layout, adjust as necessary
const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

interface LinkShareModalProps {
  open: boolean;
  handleClose: () => void;
  link: string;
  loading: boolean;
}

const LinkShareModal: React.FC<LinkShareModalProps> = ({
  open,
  handleClose,
  link,
  loading,
}) => {
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(link).then(
      () => {
        // Notify the user that the link has been copied, optionally close the modal
        handleClose();
        alert("Link copied to clipboard!");
      },
      (err) => {
        console.error("Could not copy link: ", err);
        // Handle the error (e.g., show an error message)
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="share-link-modal-title"
      aria-describedby="share-link-modal-description"
    >
      <Box sx={style}>
        <Typography id="share-link-modal-title" variant="h6" component="h2">
          Shareable Link
        </Typography>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography id="share-link-modal-description" sx={{ mt: 2 }}>
              {link}
            </Typography>
            <Button onClick={copyLinkToClipboard} sx={{ mt: 2 }}>
              Copy Link
            </Button>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default LinkShareModal;
