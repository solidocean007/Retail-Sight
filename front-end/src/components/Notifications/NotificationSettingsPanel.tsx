import React from "react";
import { useUserNotificationSettings } from "../../hooks/useUserNotificationSettings";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

import Switch from "@mui/material/Switch";
// import IconButton from "@mui/material/IconButton";

import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import FlagIcon from "@mui/icons-material/Flag";
import GroupIcon from "@mui/icons-material/Group";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

import {
  registerFcmToken,
  // hasExistingFcmToken,
  // hasTokenForThisDevice,
} from "../../firebase/messaging";
import "./notificationSettingsPanel.css";
import { useNotificationHealth } from "../../hooks/useNotificationHealth";

const NotificationSettingsPanel = () => {
  const { settings, loading, updateSetting } = useUserNotificationSettings();
  const user = useSelector(selectUser);

  const {
    permission,
    tokenStatus,
    notificationsBlocked,
    notificationsUnset,
    notificationsUnsupported,
    refreshHealth,
  } = useNotificationHealth(user?.uid);

  const pushFullyEnabled = permission === "granted" && tokenStatus === "ok";

  const pushStatusClass = pushFullyEnabled
    ? "ok"
    : notificationsBlocked || tokenStatus === "error"
      ? "error"
      : "none";

  const enablePush = async () => {
    const perm = await Notification.requestPermission();

    if (perm !== "granted") {
      await refreshHealth();
      return;
    }

    try {
      await registerFcmToken();
      await refreshHealth();
    } catch {
      await refreshHealth();
    }
  };

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div className="notif-settings-container">
      <h2 className="notif-settings-title">Notification Settings</h2>

      {/* Push Status */}
      <div className="push-status-card">
        <NotificationsActiveIcon className="push-status-icon" />

        <div className="push-status-content">
          <strong>Push Notifications:</strong>
          <div className={`push-status-text ${pushStatusClass}`}>
            {tokenStatus === "unknown" && "Checking this device..."}

            {pushFullyEnabled && "Enabled on this device"}

            {permission === "default" && "Not enabled on this browser/device"}

            {notificationsBlocked && "Blocked in browser/device settings"}

            {notificationsUnsupported &&
              "Not supported on this device or browser"}

            {permission === "granted" &&
              tokenStatus === "none" &&
              "Permission granted, but this device needs to be registered again"}

            {permission === "granted" &&
              tokenStatus === "error" &&
              "Could not verify this device"}
          </div>
        </div>

        {tokenStatus !== "unknown" &&
          !pushFullyEnabled &&
          !notificationsBlocked &&
          !notificationsUnsupported && (
            <button className="push-enable-btn" onClick={enablePush}>
              Enable
            </button>
          )}
        {notificationsBlocked && (
          <p className="push-help-text">
            Enable notifications in your browser or device settings, then return
            here.
          </p>
        )}
      </div>

      <p className="push-help-text">
        Push notifications depend on your device and browser. On iPhone, you may
        need to add Displaygram to your Home Screen before enabling push
        notifications.
      </p>

      {/* Posts */}
      <h3 className="notif-settings-section">Posts</h3>

      <SettingSwitch
        icon={<FavoriteIcon className="notif-icon heart" />}
        label="Likes"
        value={settings.likes}
        onChange={(v) => updateSetting("likes", v)}
      />

      <SettingSwitch
        icon={<ChatBubbleIcon className="notif-icon" />}
        label="Comments"
        value={settings.comments}
        onChange={(v) => updateSetting("comments", v)}
      />

      <SettingSwitch
        icon={<ThumbUpIcon className="notif-icon" />}
        label="Comment Likes"
        value={settings.commentLikes}
        onChange={(v) => updateSetting("commentLikes", v)}
      />

      {/* Goals */}
      <h3 className="notif-settings-section">Goals</h3>

      <SettingSwitch
        icon={<FlagIcon className="notif-icon" />}
        label="Goal Assignment Notifications"
        value={settings.goalAssignmentPush}
        onChange={(v) => updateSetting("goalAssignmentPush", v)}
      />

      <h3 className="notif-settings-section">Email</h3>

      <p className="notif-section-helper">
        Email notifications help you stay updated even when push notifications
        are not available on this device.
      </p>

      <SettingSwitch
        icon={<ChatBubbleIcon className="notif-icon" />}
        label="Email me when someone comments on my displays"
        value={settings.emailComments ?? true}
        onChange={(v) => updateSetting("emailComments", v)}
      />

      <SettingSwitch
        icon={<FlagIcon className="notif-icon" />}
        label="Email me when I’m assigned a goal"
        value={settings.emailGoalAssignments ?? true}
        onChange={(v) => updateSetting("emailGoalAssignments", v)}
      />

      {/* Supervisor */}
      {user?.role === "supervisor" && (
        <>
          <h3 className="notif-settings-section">Team</h3>

          <SettingSwitch
            icon={<GroupIcon className="notif-icon" />}
            label="New Display Posts From My Team"
            value={settings.supervisorDisplayAlerts}
            onChange={(v) => updateSetting("supervisorDisplayAlerts", v)}
          />
        </>
      )}
    </div>
  );
};

interface SwitchProps {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const SettingSwitch: React.FC<SwitchProps> = ({
  icon,
  label,
  value,
  onChange,
}) => (
  <div className="notif-row">
    <div className="notif-left">
      {icon}
      <span>{label}</span>
    </div>

    <Switch
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      color="primary"
    />
  </div>
);

export default NotificationSettingsPanel;
