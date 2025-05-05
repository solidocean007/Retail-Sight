import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  CircularProgress,
} from "@mui/material";
// import './customConfirmation.css'

interface CustomConfirmationProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

const CustomConfirmation: React.FC<CustomConfirmationProps> = ({
  isOpen,
  message,
  onConfirm,
  onClose,
  loading = false,
}) => {
  return (
    <Dialog open={isOpen} onClose={loading ? undefined : onClose}>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color="primary"
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Confirm"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomConfirmation;


