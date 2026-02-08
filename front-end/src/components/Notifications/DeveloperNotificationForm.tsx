import { useState } from "react";
import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Stack,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../utils/firebase";

import { UserType, CompanyWithUsersAndId } from "../../utils/types";

import NotificationAudienceBuilder from "./NotificationAudiencePicker";
import DeveloperNotificationPreviewModal from "./DeveloperNotificationPreviewModal";

type MessageType = "announcement" | "tutorial";

const createDeveloperNotification = httpsCallable(
  functions,
  "createDeveloperNotification"
);

const DeveloperNotificationForm = ({
  allCompaniesAndUsers,
}: {
  currentUser: UserType;
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}) => {
  const [messageType, setMessageType] = useState<MessageType>("announcement");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [tutorialUrl, setTutorialUrl] = useState("");

  const [sendEmail, setSendEmail] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [audienceCompanies, setAudienceCompanies] = useState<
    CompanyWithUsersAndId[]
  >([]);
  const [audienceUsers, setAudienceUsers] = useState<UserType[]>([]);
  const [audienceRoles, setAudienceRoles] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  const payload = {
  type: messageType,
  title,
  message,
  tutorialUrl: messageType === "tutorial" ? tutorialUrl : undefined,

  recipientCompanyIds: audienceCompanies.map((c) => c.id),
  recipientUserIds: audienceUsers.map((u) => u.uid),
  recipientRoles: audienceRoles,

  sendEmail,
  scheduledAt: isScheduled && scheduledAt ? scheduledAt : null,
};


  const handleSubmit = async () => {
    if (!title || !message) return;
    if (messageType === "tutorial" && !tutorialUrl) return;
    if (isScheduled && !scheduledAt) return;
if (isScheduled && scheduledAt && scheduledAt.getTime() < Date.now()) return;


    if (dryRun) {
      setPreviewOpen(true);
      return;
    }

    await createDeveloperNotification({
      ...payload,
      dryRun: false,
    });

    // reset
    setTitle("");
    setMessage("");
    setTutorialUrl("");
    setDryRun(false);
  };

  const handleConfirmSend = async () => {
    setPreviewOpen(false);

    await createDeveloperNotification({
      ...payload,
      dryRun: false,
    });

    // optional reset after confirmed send
    setTitle("");
    setMessage("");
    setTutorialUrl("");
    setDryRun(false);
  };

  return (
    <div className="dev-notification-form">
      {/* Message type */}
      <FormControl size="small" fullWidth sx={{ mb: 1 }}>
        <InputLabel>Message Type</InputLabel>
        <Select
          value={messageType}
          label="Message Type"
          onChange={(e) => setMessageType(e.target.value as MessageType)}
        >
          <MenuItem value="announcement">Announcement</MenuItem>
          <MenuItem value="tutorial">Tutorial</MenuItem>
        </Select>
      </FormControl>

      {/* Title */}
      <TextField
        label="Title"
        fullWidth
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        sx={{ mb: 1 }}
        placeholder={
          messageType === "tutorial"
            ? "Install Displaygram on Your Phone"
            : "Displaygram Update"
        }
      />

      {/* Message */}
      <TextField
        label="Message"
        fullWidth
        multiline
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        sx={{ mb: 1 }}
        placeholder={
          messageType === "tutorial"
            ? "Watch this short video to learn how to install Displaygram and submit displays more easily."
            : "We’ve made a few improvements to help you submit displays faster."
        }
      />

      {/* Tutorial URL */}
      {messageType === "tutorial" && (
        <TextField
          label="Tutorial Video URL"
          fullWidth
          value={tutorialUrl}
          onChange={(e) => setTutorialUrl(e.target.value)}
          sx={{ mb: 1 }}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      )}

      {/* Audience */}
      <NotificationAudienceBuilder
        companies={allCompaniesAndUsers}
        selectedCompanies={audienceCompanies}
        onCompanyChange={setAudienceCompanies}
        selectedUsers={audienceUsers}
        onUserChange={setAudienceUsers}
        selectedRoles={audienceRoles}
        onRoleChange={setAudienceRoles}
      />

      {/* Delivery options */}
      <Stack direction="row" spacing={2} sx={{ my: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
          }
          label="Send email"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
          }
          label="Dry run (preview only)"
        />
      </Stack>

      <FormControlLabel
        control={
          <Checkbox
            checked={isScheduled}
            onChange={(e) => {
              setIsScheduled(e.target.checked);
              if (!e.target.checked) setScheduledAt(null);
            }}
          />
        }
        label="Schedule for later"
      />

      {isScheduled && (
        <TextField
          label="Send At"
          type="datetime-local"
          value={
            scheduledAt
              ? new Date(
                  scheduledAt.getTime() -
                    scheduledAt.getTimezoneOffset() * 60000
                )
                  .toISOString()
                  .slice(0, 16)
              : ""
          }
          onChange={(e) => {
            const val = e.target.value;
            setScheduledAt(val ? new Date(val) : null);
          }}
          fullWidth
          size="small"
          sx={{ mb: 1 }}
          InputLabelProps={{ shrink: true }}
        />
      )}

      <Button
        variant="contained"
        color="primary"
        disabled={!title || !message}
        onClick={handleSubmit}
      >
        Send Message
      </Button>
      <DeveloperNotificationPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirmSend={handleConfirmSend}
        title={title}
        message={message}
        priority="normal"
        scheduledAt={scheduledAt}
        recipientCompanyIds={audienceCompanies.map((c) => c.id)}
        recipientUserIds={audienceUsers.map((u) => u.uid)}
        recipientRoles={audienceRoles}
        sendEmail={sendEmail}
        allCompaniesAndUsers={allCompaniesAndUsers}
      />
    </div>
  );
};

export default DeveloperNotificationForm;
