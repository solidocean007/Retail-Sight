import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import { CircularProgress, Switch } from "@mui/material";
import { ReactNode } from "react";
import { useSelector } from "react-redux";

import { selectUser } from "../../Slices/userSlice";
import { registerFcmToken } from "../../firebase/messaging";
import { useNotificationHealth } from "../../hooks/useNotificationHealth";
import {
  UserNotificationSettings,
  useUserNotificationSettings,
} from "../../hooks/useUserNotificationSettings";

import "./notificationSettingsPanel.css";

type BooleanSettingKey = Exclude<keyof UserNotificationSettings, "quietHours">;

const NotificationSettingsPanel = () => {
  const { settings, loading, savingKey, error, updateSetting, reload } =
    useUserNotificationSettings();
  const user = useSelector(selectUser);
  const {
    permission,
    tokenStatus,
    notificationsBlocked,
    notificationsUnsupported,
    refreshHealth,
  } = useNotificationHealth(user?.uid);

  const pushFullyEnabled = permission === "granted" && tokenStatus === "ok";
  const pushTone = pushFullyEnabled
    ? "success"
    : notificationsBlocked || tokenStatus === "error"
      ? "error"
      : "attention";

  const pushStatus =
    tokenStatus === "unknown"
      ? "Checking this device…"
      : pushFullyEnabled
        ? "Push alerts are active on this device."
        : notificationsBlocked
          ? "Push alerts are blocked in this browser’s settings."
          : notificationsUnsupported
            ? "Push alerts aren’t supported on this browser or device."
            : permission === "granted"
              ? "This device needs to be registered again."
              : "Push alerts haven’t been enabled on this device.";

  const enablePush = async () => {
    if (
      typeof Notification === "undefined" ||
      notificationsUnsupported ||
      notificationsBlocked
    ) {
      await refreshHealth();
      return;
    }

    const nextPermission = await Notification.requestPermission();
    if (nextPermission === "granted") {
      try {
        await registerFcmToken();
      } catch (pushError) {
        console.error("Could not register this device for push:", pushError);
      }
    }

    await refreshHealth();
  };

  if (loading) {
    return (
      <div className="notification-preferences__state" role="status">
        <CircularProgress size={28} />
        <strong>Loading preferences</strong>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="notification-preferences__state">
        <NotificationsActiveOutlinedIcon />
        <strong>Preferences unavailable</strong>
        <span>
          {error || "We couldn’t load your notification preferences."}
        </span>
        <button type="button" onClick={() => void reload()}>
          Try again
        </button>
      </div>
    );
  }

  const renderSetting = (
    key: BooleanSettingKey,
    icon: ReactNode,
    label: string,
    description: string,
  ) => (
    <SettingSwitch
      key={key}
      icon={icon}
      label={label}
      description={description}
      value={Boolean(settings[key])}
      disabled={savingKey !== null}
      saving={savingKey === key}
      onChange={(value) => void updateSetting(key, value)}
    />
  );

  return (
    <div className="notification-preferences">
      <section className="notification-preferences__section">
        <div className="notification-preferences__section-heading">
          <div>
            <h2>Delivery on this device</h2>
            <p>Browser permission and device registration are managed here.</p>
          </div>
        </div>

        <div
          className={`notification-device-card notification-device-card--${pushTone}`}
        >
          <span className="notification-device-card__icon" aria-hidden="true">
            <NotificationsActiveOutlinedIcon />
          </span>
          <div>
            <strong>Push notifications</strong>
            <p>{pushStatus}</p>
          </div>
          {!pushFullyEnabled &&
            !notificationsBlocked &&
            !notificationsUnsupported &&
            tokenStatus !== "unknown" && (
              <button type="button" onClick={() => void enablePush()}>
                {permission === "granted" ? "Register again" : "Enable"}
              </button>
            )}
        </div>

        {notificationsBlocked && (
          <p className="notification-preferences__notice">
            Allow notifications in your browser or device settings, then return
            here. On iPhone, Displaygram may need to be installed on the Home
            Screen first.
          </p>
        )}
      </section>

      <section className="notification-preferences__section">
        <div className="notification-preferences__section-heading">
          <div>
            <h2>Display activity</h2>
            <p>
              Choose which interactions should create an in-app and push alert.
            </p>
          </div>
        </div>
        <div className="notification-preferences__rows">
          {renderSetting(
            "likes",
            <FavoriteBorderRoundedIcon />,
            "Likes",
            "When someone likes one of your displays.",
          )}
          {renderSetting(
            "comments",
            <ChatBubbleOutlineRoundedIcon />,
            "Comments and replies",
            "When someone comments on your display or replies to you.",
          )}
          {renderSetting(
            "commentLikes",
            <ThumbUpOutlinedIcon />,
            "Comment likes",
            "When someone likes one of your comments.",
          )}
        </div>
      </section>

      <section className="notification-preferences__section">
        <div className="notification-preferences__section-heading">
          <div>
            <h2>Goals</h2>
            <p>Stay informed when new work is assigned.</p>
          </div>
        </div>
        <div className="notification-preferences__rows">
          {renderSetting(
            "goalAssignmentPush",
            <FlagOutlinedIcon />,
            "Goal assignments",
            "In-app and push alerts when a goal is assigned to you.",
          )}
        </div>
      </section>

      <section className="notification-preferences__section">
        <div className="notification-preferences__section-heading">
          <div>
            <h2>Email</h2>
            <p>Email can reach you when this device is offline.</p>
          </div>
        </div>
        <div className="notification-preferences__rows">
          {renderSetting(
            "emailComments",
            <AlternateEmailRoundedIcon />,
            "Comment email",
            "Send an email for new comments and replies.",
          )}
        </div>
      </section>

      {user?.role === "supervisor" && (
        <section className="notification-preferences__section">
          <div className="notification-preferences__section-heading">
            <div>
              <h2>Team</h2>
              <p>Supervisor-only alerts about team activity.</p>
            </div>
          </div>
          <div className="notification-preferences__rows">
            {renderSetting(
              "supervisorDisplayAlerts",
              <GroupOutlinedIcon />,
              "New team displays",
              "Alert me when someone on my team creates a display.",
            )}
          </div>
        </section>
      )}

      {error && <p className="notification-preferences__error">{error}</p>}
    </div>
  );
};

type SettingSwitchProps = {
  icon: ReactNode;
  label: string;
  description: string;
  value: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: (value: boolean) => void;
};

const SettingSwitch = ({
  icon,
  label,
  description,
  value,
  disabled,
  saving,
  onChange,
}: SettingSwitchProps) => (
  <div className="notification-setting-row">
    <span className="notification-setting-row__icon" aria-hidden="true">
      {icon}
    </span>
    <div>
      <strong>{label}</strong>
      <p>{description}</p>
    </div>
    {saving ? (
      <CircularProgress size={19} />
    ) : (
      <Switch
        checked={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        inputProps={{ "aria-label": label }}
        size="small"
      />
    )}
  </div>
);

export default NotificationSettingsPanel;
