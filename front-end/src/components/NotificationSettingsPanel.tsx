import React from "react";
import { useUserNotificationSettings } from "../hooks/useUserNotificationSettings";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { getFunctions, httpsCallable } from "firebase/functions";
import { registerFcmToken } from "../firebase/messaging";

interface SettingToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const NotificationSettingsPanel = () => {
  const { settings, loading, updateSetting } = useUserNotificationSettings();

  const fn = httpsCallable(getFunctions(), "sendTestPush");

  const handleTestNotification = async () => {
    const token = await registerFcmToken(); // <= ALWAYS use the real token

    fn({ token })
      .then((res) => console.log("RESULT:", res))
      .catch(console.error);
  };

  const user = useSelector(selectUser);

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        Notification Settings
      </h2>

      <button onClick={handleTestNotification}>Test Notification</button>

      {/* Posts */}
      <h3>Posts</h3>
      <SettingToggle
        label="Likes"
        value={settings.likes}
        onChange={(v) => updateSetting("likes", v)}
      />
      <SettingToggle
        label="Comments"
        value={settings.comments}
        onChange={(v) => updateSetting("comments", v)}
      />
      <SettingToggle
        label="Comment Likes"
        value={settings.commentLikes}
        onChange={(v) => updateSetting("commentLikes", v)}
      />

      {/* Goals */}
      <h3 style={{ marginTop: "2rem" }}>Goals</h3>
      <SettingToggle
        label="New Goal Assignments"
        value={settings.goalAssignments}
        onChange={(v) => updateSetting("goalAssignments", v)}
      />

      {/* Supervisor section */}
      {user?.role === "supervisor" && (
        <>
          <h3 style={{ marginTop: "2rem" }}>Team</h3>
          <SettingToggle
            label="New Display Posts From My Team"
            value={settings.supervisorDisplayAlerts}
            onChange={(v) => updateSetting("supervisorDisplayAlerts", v)}
          />
        </>
      )}
    </div>
  );
};

const SettingToggle: React.FC<SettingToggleProps> = ({
  label,
  value,
  onChange,
}) => (
  <label style={{ display: "block", margin: "0.4rem 0", cursor: "pointer" }}>
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      style={{ marginRight: "8px" }}
    />
    {label}
  </label>
);

export default NotificationSettingsPanel;
