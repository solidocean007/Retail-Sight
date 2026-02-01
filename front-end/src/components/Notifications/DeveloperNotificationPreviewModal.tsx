// components/Notifications/DeveloperNotificationPreviewModal.tsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Chip,
} from "@mui/material";
import {
  CompanyWithUsersAndId,
  UserType,
} from "../../utils/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmSend: () => void;

  title: string;
  message: string;
  priority?: string;

  recipientCompanyIds: string[];
  recipientUserIds: string[];
  recipientRoles: string[];

  sendEmail: boolean;
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}

const DeveloperNotificationPreviewModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirmSend,
  title,
  message,
  priority,
  recipientCompanyIds,
  recipientUserIds,
  recipientRoles,
  sendEmail,
  allCompaniesAndUsers,
}) => {
  const resolveRecipients = () => {
    const results: { company: string; users: UserType[] }[] = [];

    allCompaniesAndUsers.forEach((company) => {
      if (
        recipientCompanyIds.length &&
        !recipientCompanyIds.includes(company.id)
      ) {
        return;
      }

      const allUsers: UserType[] = [
        ...company.superAdminDetails,
        ...company.adminDetails,
        ...company.employeeDetails,
        ...company.pendingDetails,
      ];

      let users = allUsers;

      if (recipientUserIds.length) {
        users = users.filter((u) => recipientUserIds.includes(u.uid));
      }

      if (recipientRoles.length) {
        users = users.filter((u) => recipientRoles.includes(u.role));
      }

      if (users.length) {
        results.push({ company: company.companyName, users });
      }
    });

    return results;
  };

  const resolved = resolveRecipients();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>🔍 Preview Notification (Dry Run)</DialogTitle>

      <DialogContent dividers>
        <Typography variant="subtitle2" gutterBottom>
          Priority: {priority ?? "normal"}
        </Typography>

        <Typography variant="h6">{title}</Typography>
        <Typography variant="body1" paragraph>
          {message}
        </Typography>

        <Stack direction="row" spacing={1} mb={2}>
          <Chip label="In-App" />
          {sendEmail && <Chip label="Email" />}
          <Chip color="warning" label="Dry Run" />
        </Stack>

        <Typography variant="h6" gutterBottom>
          Intended Recipients
        </Typography>

        {resolved.map(({ company, users }) => (
          <div key={company} style={{ marginBottom: "1rem" }}>
            <Typography variant="subtitle1">📦 {company}</Typography>
            <Typography variant="body2" color="textSecondary">
              {users.length} user{users.length !== 1 ? "s" : ""}
            </Typography>

            <ul style={{ marginTop: 4 }}>
              {users.map((u) => (
                <li key={u.uid}>
                  {u.firstName} {u.lastName} — {u.role}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={onConfirmSend}
          variant="contained"
          color="primary"
        >
          Send for Real
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeveloperNotificationPreviewModal;
