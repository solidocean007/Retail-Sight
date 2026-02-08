// components/Notifications/ViewNotificationModal.tsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { UserNotificationType } from "../../utils/types";

interface Props {
  open: boolean;
  onClose: () => void;
  notification: UserNotificationType | null;
  openPostViewer?: (postId: string) => void;
}

const ViewNotificationModal: React.FC<Props> = ({
  open,
  onClose,
  notification,
  openPostViewer,
}) => {
  if (!notification) return null;

  const handleViewPost = () => {
    if (notification.postId && openPostViewer) {
      openPostViewer(notification.postId);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{notification.title}</DialogTitle>

      <DialogContent dividers>
        <Typography variant="subtitle2" gutterBottom>
          Received: {notification.createdAt.toLocaleString()}
        </Typography>

        <Typography variant="body1" paragraph>
          {notification.message}
        </Typography>
      </DialogContent>

      <DialogActions>
        {notification.postId && (
          <Button onClick={handleViewPost}>View Post</Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewNotificationModal;
