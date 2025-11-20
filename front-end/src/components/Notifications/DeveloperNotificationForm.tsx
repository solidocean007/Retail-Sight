// components/Admin/DeveloperNotificationForm.tsx
import { useState } from "react";
import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  // Chip,
  Stack,
} from "@mui/material";
import { Timestamp } from "firebase/firestore";
import {
  // CompanyType,
  UserType,
  PriorityType,
  NotificationType,
  // CompanyTypeWithId,
  CompanyWithUsersAndId,
} from "../../utils/types";
import { useAppDispatch } from "../../utils/store";
// import { LocalizationProvider } from "@mui/x-date-pickers";
// import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import NotificationAudienceBuilder from "./NotificationAudiencePicker";

const DeveloperNotificationForm = ({
  currentUser,
  allCompaniesAndUsers,
}: {
  currentUser: UserType;
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}) => {
  const dispatch = useAppDispatch();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<PriorityType>("normal");
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  const [audienceCompanies, setAudienceCompanies] = useState<CompanyWithUsersAndId[]>([]);
  const [audienceUsers, setAudienceUsers] = useState<UserType[]>([]);
  const [audienceRoles, setAudienceRoles] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!title || !message) return;

    const notification: NotificationType = {
      id: "",
      title,
      message,
      priority,
      sentAt: Timestamp.now(),
      sentBy: currentUser,
      recipientCompanyIds: audienceCompanies.map((c) => c.id),
      recipientUserIds: audienceUsers.map((u) => u.uid),
      recipientRoles: audienceRoles,
      scheduledAt: scheduledAt ? Timestamp.fromDate(scheduledAt) : null,
      readBy: [],
      pinned: false,
    };

    // dispatch(
    //   sendNotification({
    //     // companyId: currentUser.companyId || "global",
    //     notification,
    //   })
    // );

    setTitle("");
    setMessage("");
    setScheduledAt(null);
    setAudienceCompanies([]);
    setAudienceUsers([]);
    setAudienceRoles([]);
  };

  return (
    <div className="dev-notification-form">
      <TextField
        label="Title"
        fullWidth
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: "0.5rem" }}
      />
      <TextField
        label="Message"
        fullWidth
        multiline
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ marginBottom: "0.5rem" }}
      />

      <Stack direction="row" spacing={2} style={{ marginBottom: "0.5rem" }}>
        <FormControl size="small" style={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityType)}
          >
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>

        {/* <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateTimePicker
            label="Schedule for later (optional)"
            value={scheduledAt}
            onChange={(newValue: Date | null) => setScheduledAt(newValue)}
            slotProps={{ textField: { size: "small" } }}
          />
        </LocalizationProvider> */}
      </Stack>

      <NotificationAudienceBuilder
        companies={allCompaniesAndUsers}
        selectedCompanies={audienceCompanies}
        onCompanyChange={setAudienceCompanies} 
        selectedUsers={audienceUsers}
        onUserChange={setAudienceUsers}
        selectedRoles={audienceRoles}
        onRoleChange={setAudienceRoles}
      />

      <Button
        variant="contained"
        color="primary"
        disabled={!title || !message}
        onClick={handleSubmit}
      >
        Send Notification
      </Button>
    </div>
  );
};

export default DeveloperNotificationForm;
