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
  DeveloperNotificationType,
  UserType,
} from "../../utils/types";

interface Props {
  open: boolean;
  onClose: () => void;
  notification: DeveloperNotificationType | null;
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}

const ViewDeveloperNotification: React.FC<Props> = ({
  open,
  onClose,
  notification,
  allCompaniesAndUsers,
}) => {
  if (!notification) return null;
  console.log(notification, " : view dev notif");
  const {
    title,
    message,
    sentAt,
    link,
    recipientCompanyIds,
    recipientUserIds,
    recipientRoles,
    priority,
  } = notification;

  const formatDate = (date: any) => {
    try {
      if (typeof date === "string") return new Date(date).toLocaleString();
      if (date?.toDate) return date.toDate().toLocaleString();
      if (date instanceof Date) return date.toLocaleString();
    } catch {
      /* noop */
    }
    return "Unknown";
  };

  const renderCompanyBreakdown = () => {
    return allCompaniesAndUsers
      .filter(
        (company) =>
          !recipientCompanyIds?.length ||
          recipientCompanyIds.includes(company.id),
      )
      .map((company) => {
        const allUsers: UserType[] = [
          ...company.superAdminDetails,
          ...company.adminDetails,
          ...company.employeeDetails,
          ...company.pendingDetails,
        ];

        let targetedUsers = allUsers;

        // If explicit users were selected, filter to them
        if (recipientUserIds?.length) {
          targetedUsers = allUsers.filter((u) =>
            recipientUserIds.includes(u.uid),
          );
        }

        // If roles were selected, filter to them
        if (recipientRoles?.length) {
          targetedUsers = targetedUsers.filter((u) =>
            recipientRoles.includes(u.role),
          );
        }

        if (!targetedUsers.length) return null;

        return (
          <div key={company.id} style={{ marginBottom: "1.5rem" }}>
            <Typography variant="subtitle1">
              📦 {company.companyName}
            </Typography>

            <Typography variant="body2" color="textSecondary">
              {targetedUsers.length} intended recipient
              {targetedUsers.length !== 1 ? "s" : ""}
            </Typography>

            <List dense>
              {targetedUsers.map((user) => (
                <ListItem key={user.uid}>
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary={`Role: ${user.role}`}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ mt: 1 }} />
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
          Priority: {priority ?? "normal"}
        </Typography>

        <Typography variant="body1" paragraph>
          {message}
        </Typography>
        <Typography variant="body1" paragraph>
          <button>{link}</button>
        </Typography>

        {/* Audience summary */}
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
          {recipientUserIds?.length ? (
            <Chip
              color="primary"
              label={`${recipientUserIds.length} Direct User${
                recipientUserIds.length !== 1 ? "s" : ""
              }`}
            />
          ) : recipientCompanyIds?.length ? (
            <Chip
              color="primary"
              label={`${recipientCompanyIds.length} Compan${
                recipientCompanyIds.length !== 1 ? "ies" : "y"
              }`}
            />
          ) : (
            <Chip color="primary" label="All Companies" />
          )}

          {recipientRoles?.length ? (
            <Chip label={`Roles: ${recipientRoles.join(", ")}`} />
          ) : null}
        </Stack>

        <Typography variant="h6" gutterBottom>
          Intended Recipients
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
