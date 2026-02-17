import React, { useEffect, useState } from "react";
import { useUserNotificationSettings } from "../../hooks/useUserNotificationSettings";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";

import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import FlagIcon from "@mui/icons-material/Flag";
import GroupIcon from "@mui/icons-material/Group";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

import {
  registerFcmToken,
  hasExistingFcmToken,
  hasTokenForThisDevice,
} from "../../firebase/messaging";
import "./notificationSettingsPanel.css";

const NotificationSettingsPanel = () => {
  const { settings, loading, updateSetting } = useUserNotificationSettings();
  const user = useSelector(selectUser);

  const [tokenStatus, setTokenStatus] = useState<"none" | "ok" | "error">(
    "none",
  );

  // Check status without generating a token
  useEffect(() => {
    const check = async () => {
      try {
        if (user) {
          const exists = await hasTokenForThisDevice(user.uid);

          setTokenStatus(exists ? "ok" : "none");
        }
      } catch {
        setTokenStatus("error");
      }
    };

    check();
  }, [user]);

  const enablePush = async () => {
    // 1. Ask user’s permission
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setTokenStatus("none");
      return;
    }

    // 2. Only now try to register token
    try {
      const token = await registerFcmToken();
      setTokenStatus(token ? "ok" : "none");
    } catch {
      setTokenStatus("error");
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
          <div className={`push-status-text ${tokenStatus}`}>
            {tokenStatus === "ok" && "Enabled on this device"}
            {tokenStatus === "none" && "Not enabled"}
            {tokenStatus === "error" && "Could not register"}
          </div>
        </div>

        {tokenStatus !== "ok" && (
          <button className="push-enable-btn" onClick={enablePush}>
            Enable
          </button>
        )}
      </div>

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
