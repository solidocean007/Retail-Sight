import { UserNotificationType } from "../../../utils/types";

export const getNotificationPostId = (notif: UserNotificationType) => {
  return notif.postId || notif.relatedPostId || null;
};

export const isCommentNotification = (notif: UserNotificationType) => {
  return notif.type === "comment" || Boolean(notif.commentId);
};