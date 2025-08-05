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
import { NotificationType } from "../../utils/types";

interface Props {
  open: boolean;
  onClose: () => void;
  notification: NotificationType | null;
  openPostViewer?: (postId: string) => void;
}

const ViewNotificationModal: React.FC<Props> = ({
  open,
  onClose,
  notification,
  openPostViewer,
}) => {
  if (!notification) return null;
  const formatDate = (date: any) =>
    date instanceof Date
      ? date.toLocaleString()
      : new Date(date?.seconds * 1000).toLocaleString();

  const handleViewPost = () => {
    if (notification.postId && openPostViewer) {
      openPostViewer(notification.postId);
      onClose(); // close the modal after opening post
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Button onClick={onClose} variant="contained">
        Close
      </Button>
      <DialogTitle>{notification.title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" gutterBottom>
          Sent by: {notification.sentBy?.firstName}{" "}
          {notification.sentBy?.lastName} ({notification.sentBy?.company})
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Sent: {formatDate(notification.sentAt)}
        </Typography>

        <Typography variant="body1" paragraph>
          {notification.message}
        </Typography>
      </DialogContent>
      <DialogActions></DialogActions>
      <DialogActions>
        {notification.postId && (
          <Button onClick={handleViewPost}>View Post</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ViewNotificationModal;
