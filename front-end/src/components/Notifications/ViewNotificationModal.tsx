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
}

const ViewNotificationModal: React.FC<Props> = ({ open, onClose, notification }) => {
  if (!notification) return null;

  const formatDate = (date: any) =>
    date instanceof Date
      ? date.toLocaleString()
      : new Date(date?.seconds * 1000).toLocaleString();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{notification.title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" gutterBottom>
          Sent by: {notification.sentBy?.firstName} {notification.sentBy?.lastName} ({notification.sentBy?.company})
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Sent: {formatDate(notification.sentAt)}
        </Typography>

        <Typography variant="body1" paragraph>
          {notification.message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewNotificationModal;