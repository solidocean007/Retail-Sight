import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useNotificationActions } from "../../hooks/useNotificationActions";
import { OpenPostViewerOptions, UserNotificationType } from "../../utils/types";
import {
  getNotificationPostId,
  isCommentNotification,
} from "./utils/notificationHelpers";

import "./notifications/view-notification-modal.css";

type ViewNotificationModalProps = {
  open: boolean;
  onClose: () => void;
  notification: UserNotificationType | null;
  openPostViewer?: (options: OpenPostViewerOptions) => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const ViewNotificationModal = ({
  open,
  onClose,
  notification,
  openPostViewer,
}: ViewNotificationModalProps) => {
  const navigate = useNavigate();
  const { trackClick } = useNotificationActions();

  if (!notification) return null;

  const postId = getNotificationPostId(notification);
  const formattedDate = formatDate(notification.createdAt);

  const handleLink = () => {
    if (!notification.link) return;
    void trackClick(notification.id, "modal");

    if (notification.link.startsWith("http")) {
      window.open(notification.link, "_blank", "noopener,noreferrer");
    } else {
      navigate(notification.link);
    }

    onClose();
  };

  const handleViewPost = () => {
    if (!postId) return;
    void trackClick(notification.id, "modal");

    const options: OpenPostViewerOptions = {
      postId,
      focusCommentId: notification.commentId ?? null,
      openComments: isCommentNotification(notification),
      source: "notification",
    };

    if (openPostViewer) {
      openPostViewer(options);
    } else {
      navigate(`/post/${postId}`);
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="notification-detail-dialog"
    >
      <DialogTitle>
        <div>
          <span>Notification</span>
          <h2>{notification.title}</h2>
        </div>
        <IconButton aria-label="Close notification" onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {formattedDate && <time>{formattedDate}</time>}
        <p>{notification.message}</p>
      </DialogContent>

      <DialogActions>
        {notification.link && !postId && (
          <Button startIcon={<LinkRoundedIcon />} onClick={handleLink}>
            Open update
          </Button>
        )}
        {postId && (
          <Button
            variant="contained"
            startIcon={<OpenInNewRoundedIcon />}
            onClick={handleViewPost}
          >
            View display
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewNotificationModal;
