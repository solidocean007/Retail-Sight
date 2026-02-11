// components/Notifications/ViewNotificationModal.tsx
import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { UserNotificationType } from "../../utils/types";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  useEffect(() => {
    if (!notification || notification.readAt) return;

    const ref = doc(
      db,
      "users",
      notification.userId,
      "notifications",
      notification.id,
    );

    updateDoc(ref, {
      readAt: serverTimestamp(),
    }).catch(() => {});
  }, [notification]);

  if (!notification) return null;

  // -----------------------------
  // Format Firestore timestamp → local readable date
  // -----------------------------
  const formattedDate = (() => {
    if (!notification.createdAt) return "";

    try {
      let date: Date;

      if (
        typeof notification.createdAt === "object" &&
        notification.createdAt !== null &&
        "toDate" in notification.createdAt
      ) {
        date = (notification.createdAt as any).toDate();
      } else {
        date = new Date(notification.createdAt as string);
      }

      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  })();

  // -----------------------------
  // Track click + navigate
  // -----------------------------
  const handleNotificationClick = async (
    notif: UserNotificationType,
    source: "modal" | "dropdown" | "push",
  ) => {
    try {
      const ref = doc(db, "users", notif.userId, "notifications", notif.id);

      await updateDoc(ref, {
        "analytics.clickedAt": serverTimestamp(),
        "analytics.clickedFrom": source,
      });
    } catch (err) {
      console.error("Failed to track notification click", err);
    }

    if (!notif.link) return;

    if (notif.link.startsWith("http")) {
      window.open(notif.link, "_blank", "noopener,noreferrer");
    } else {
      navigate(notif.link);
    }

    onClose();
  };

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
        {formattedDate && (
          <Typography variant="subtitle2" gutterBottom>
            Received: {formattedDate}
          </Typography>
        )}

        <Typography variant="body1" paragraph>
          {notification.message}
        </Typography>
      </DialogContent>

      <DialogActions>
        {notification.link && (
          <Button
            variant="outlined"
            onClick={() => handleNotificationClick(notification, "modal")}
          >
            Open Link
          </Button>
        )}

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
