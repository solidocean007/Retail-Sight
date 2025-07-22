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
import { CompanyType, UserType, NotificationType } from "../../utils/types";

interface DeveloperNotificationFormProps {
  isDeveloper: boolean;
}

const DeveloperNotificationForm: React.FC<DeveloperNotificationFormProps> = ({ isDeveloper }) => {
  const dispatch = useAppDispatch();
  const companies = useSelector((state: RootState) => state.company.);
  const users = useSelector((state: RootState) => state.user.allUsers);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [audienceType, setAudienceType] = useState("all"); // all, companies, users
  const [selectedCompanies, setSelectedCompanies] = useState<CompanyType[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);

  const handleSendNotification = () => {
    if (!title || !message) return;

    const recipientCompanyIds =
      audienceType === "companies"
        ? selectedCompanies.map((c) => c.id) // id doesnt exist on company type
        : audienceType === "all"
        ? []
        : Array.from(new Set(selectedUsers.map((u) => u.companyId)));

    const recipientUserIds =
      audienceType === "users" ? selectedUsers.map((u) => u.uid) : [];

    const notification: NotificationType = {
      id: "", // Firestore generates
      title,
      message,
      priority, // Type 'string' is not assignable to type '"high" | "normal" | "low
      sentAt: new Date(), // Type 'Date' is missing the following properties from type 'Timestamp': seconds, nanoseconds, toDate, toMillis, isEqual
      sentBy: currentUser?.uid || "system", // Type 'string' is not assignable to type 'UserType'.ts(2322)
      recipientsIds: recipientCompanyIds,
      readBy: [],
      pinned: false,
    };

    dispatch(
      sendNotification({
        companyId: currentUser?.companyId || "global",
        notification,
        recipientUserIds, // Object literal may only specify known properties, and 'recipientUserIds' does not exist in type '{ companyId: string; notification: NotificationType; }'
      })
    );

    setTitle("");
    setMessage("");
    setPriority("Normal");
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
          onChange={(e) => setPriority(e.target.value)}
        >
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Normal">Normal</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
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
                key={option.id} // id doesn't exist on company type
              />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Select Companies" />
          )}
          style={{ marginBottom: "0.5rem" }}
        />
      )}

      {audienceType === "users" && (
        <Autocomplete
          multiple
          options={users}
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
