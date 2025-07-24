import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { sendNotification } from "../../thunks/notificationsThunks";
import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Chip,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  CompanyType,
  UserType,
  NotificationType,
  PriorityType,
  CompanyTypeWithId,
} from "../../utils/types";
import { Timestamp } from "firebase/firestore";
import {
  selectAllCompanies,
  selectCompaniesWithUsers,
} from "../../Slices/allCompaniesSlice";

interface DeveloperNotificationFormProps {
  isDeveloper: boolean;
}

const DeveloperNotificationForm: React.FC<DeveloperNotificationFormProps> = ({
  isDeveloper,
}) => {
  const dispatch = useAppDispatch();
  const companies = useSelector(selectCompaniesWithUsers);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<PriorityType>("normal");
  const [audienceType, setAudienceType] = useState("all"); // all, companies, users
  const [selectedCompanies, setSelectedCompanies] = useState<
    CompanyTypeWithId[]
  >([]);
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);

  const allUsers: UserType[] = React.useMemo(
    () =>
      companies.flatMap((company) => [
        ...company.superAdminDetails,
        ...company.adminDetails,
        ...company.employeeDetails,
        ...company.pendingDetails,
      ]),
    [companies]
  );

  const handleSendNotification = () => {
    if (!title || !message || !currentUser) return;

    const recipientCompanyIds =
      audienceType === "companies"
        ? selectedCompanies.map((c) => c.id)
        : audienceType === "all"
        ? []
        : Array.from(new Set(selectedUsers.map((u) => u.companyId)));

    const recipientUserIds =
      audienceType === "users" ? selectedUsers.map((u) => u.uid) : [];

    const notification: NotificationType = {
      id: "", // Firestore will generate
      title,
      message,
      priority,
      sentAt: Timestamp.fromDate(new Date()),
      sentBy: currentUser,
      recipientsIds: recipientCompanyIds,
      readBy: [],
      pinned: false,
    };

    dispatch(
      sendNotification({
        companyId: currentUser.companyId || "global",
        notification,
        recipientUserIds:
          audienceType === "users" ? recipientUserIds : undefined,
      })
    );

    setTitle("");
    setMessage("");
    setPriority("normal");
    setSelectedCompanies([]);
    setSelectedUsers([]);
  };

  return (
    <div className="notification-form">
      <TextField
        fullWidth
        label="Title"
        variant="outlined"
        size="small"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: "0.5rem" }}
      />
      <TextField
        fullWidth
        label="Message"
        variant="outlined"
        size="small"
        multiline
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ marginBottom: "0.5rem" }}
      />
      <FormControl fullWidth size="small" style={{ marginBottom: "0.5rem" }}>
        <InputLabel id="priority-label">Priority</InputLabel>
        <Select
          labelId="priority-label"
          value={priority}
          onChange={(e) => setPriority(e.target.value as PriorityType)}
        >
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="low">Low</MenuItem>
        </Select>
      </FormControl>

      {isDeveloper && (
        <FormControl fullWidth size="small" style={{ marginBottom: "0.5rem" }}>
          <InputLabel id="audience-label">Audience</InputLabel>
          <Select
            labelId="audience-label"
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value)}
          >
            <MenuItem value="all">All Companies</MenuItem>
            <MenuItem value="companies">Specific Companies</MenuItem>
            <MenuItem value="users">Specific Users</MenuItem>
          </Select>
        </FormControl>
      )}

      {isDeveloper && audienceType === "companies" && (
        <Autocomplete
          multiple
          options={companies}
          getOptionLabel={(option) => option.companyName}
          value={selectedCompanies}
          onChange={(event, value) => setSelectedCompanies(value)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option.companyName}
                {...getTagProps({ index })}
                key={option.id}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Select Companies"
            />
          )}
          style={{ marginBottom: "0.5rem" }}
        />
      )}

      {audienceType === "users" && (
        <Autocomplete
          multiple
          options={allUsers}
          getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
          value={selectedUsers}
          onChange={(event, value) => setSelectedUsers(value)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={`${option.firstName} ${option.lastName}`}
                {...getTagProps({ index })}
                key={option.uid}
              />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Select Users" />
          )}
          style={{ marginBottom: "0.5rem" }}
        />
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleSendNotification}
        disabled={!title || !message}
      >
        Send Notification
      </Button>
    </div>
  );
};

export default DeveloperNotificationForm;
