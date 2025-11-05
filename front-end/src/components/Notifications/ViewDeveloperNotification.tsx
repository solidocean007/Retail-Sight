// components/Notifications/ViewDeveloperNotification.tsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import {
  CompanyWithUsersAndId,
  NotificationType,
  UserType,
} from "../../utils/types";

interface Props {
  open: boolean;
  onClose: () => void;
  notification: NotificationType | null;
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}

const ViewDeveloperNotification: React.FC<Props> = ({
  open,
  onClose,
  notification,
  allCompaniesAndUsers,
}) => {
  if (!notification) return null;

  const {
    title,
    message,
    sentAt,
    recipientCompanyIds,
    recipientUserIds,
    recipientRoles,
    readBy = [],
    priority,
    pinned,
  } = notification;

  const formatDate = (date: any) => {
    try {
      if (typeof date === "string") {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) return parsed.toLocaleString();
      }
      if (date?.toDate) return date.toDate().toLocaleString();
      if (date instanceof Date) return date.toLocaleString();
      if (date?.seconds) return new Date(date.seconds * 1000).toLocaleString();
    } catch (e) {
      console.warn("Invalid date:", date);
    }
    return "Unknown";
  };

  const renderCompanyBreakdown = () => {
    return allCompaniesAndUsers
      .filter(
        (company) =>
          !recipientCompanyIds?.length ||
          recipientCompanyIds.includes(company.id)
      )
      .map((company) => {
        const allUsers: UserType[] = [
          ...company.superAdminDetails,
          ...company.adminDetails,
          ...company.employeeDetails,
          ...company.pendingDetails,
        ];

        const targetedUsers = recipientUserIds?.length
          ? allUsers.filter((user) => recipientUserIds.includes(user.uid))
          : allUsers;

        if (targetedUsers.length === 0) return null;

        const readUsers = targetedUsers.filter((u) => readBy.includes(u.uid));
        const unreadUsers = targetedUsers.filter(
          (u) => !readBy.includes(u.uid)
        );

        return (
          <div key={company.id} style={{ marginBottom: "1.5rem" }}>
            <Typography variant="subtitle1">
              📦 {company.companyName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {readUsers.length} read, {unreadUsers.length} unread
            </Typography>
            <List dense>
              {readUsers.map((user) => (
                <ListItem key={user.uid}>
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary="✅ Read"
                  />
                </ListItem>
              ))}
              {unreadUsers.map((user) => (
                <ListItem key={user.uid}>
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary="❌ Unread"
                  />
                </ListItem>
              ))}
            </List>
            <Divider style={{ marginTop: "0.5rem" }} />
          </div>
        );
      });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" gutterBottom>
          Sent: {formatDate(sentAt)}
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Priority: {priority} {pinned ? "📌" : ""}
        </Typography>

        <Typography variant="body1" paragraph>
          {message}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" marginBottom={2}>
          {recipientCompanyIds?.length ? (
            <Chip label={`${recipientCompanyIds.length} Company Targets`} />
          ) : (
            <Chip label="All Companies" />
          )}
          {recipientRoles && recipientRoles?.length > 0 && (
            <Chip label={`Roles: ${recipientRoles.join(", ")}`} />
          )}
          {recipientUserIds && recipientUserIds?.length > 0 && (
            <Chip label={`${recipientUserIds.length} Direct Users`} />
          )}
        </Stack>

        <Typography variant="h6" gutterBottom>
          Recipient Breakdown
        </Typography>
        {renderCompanyBreakdown()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewDeveloperNotification;
