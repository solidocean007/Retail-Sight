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
import { OpenPostViewerOptions, UserNotificationType } from "../../utils/types";
import { useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getNotificationPostId,
  isCommentNotification,
} from "./utils/notificationHelpers";

interface Props {
  open: boolean;
  onClose: () => void;
  notification: UserNotificationType | null;
  openPostViewer?: (options: OpenPostViewerOptions) => void;
}

const ViewNotificationModal: React.FC<Props> = ({
  open,
  onClose,
  notification,
  openPostViewer,
}) => {
  const navigate = useNavigate();
  const functions = getFunctions();
  const trackNotificationClick = httpsCallable(
    functions,
    "trackNotificationClickCallable",
  );

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
      await trackNotificationClick({
        notificationId: notif.id,
        source: source,
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

  const handleViewPost = async () => {
    if (!notification || !openPostViewer) return;

    const targetPostId = getNotificationPostId(notification);
    if (!targetPostId) return;

    try {
      await trackNotificationClick({
        notificationId: notification.id,
        source: "modal",
      });
    } catch (err) {
      console.error("Failed to track notification click", err);
    }

    openPostViewer({
      postId: targetPostId,
      focusCommentId: notification.commentId ?? null,
      openComments: isCommentNotification(notification),
      source: "notification",
    });

    onClose();
  };

  const truncateLink = (url: string, max = 35) => {
    if (url.length <= max) return url;
    return url.slice(0, max) + "…";
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

      <DialogActions
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        {notification.link && (
          <Button
            variant="outlined"
            onClick={() => handleNotificationClick(notification, "modal")}
            sx={{
              maxWidth: 300,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={notification.link} // 👈 full URL on hover
          >
            {truncateLink(notification.link)}
          </Button>
        )}

        {getNotificationPostId(notification) && (
          <Button onClick={handleViewPost}>View Post</Button>
        )}

        {/* <Button onClick={onClose} variant="contained">
          Close
        </Button> */}
      </DialogActions>
    </Dialog>
  );
};

export default ViewNotificationModal;
