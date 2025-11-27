import React from "react";
import { useUserNotificationSettings } from "../hooks/useUserNotificationSettings";

const NotificationSettingsPanel = () => {
  const { settings, loading, updateSetting } =
    useUserNotificationSettings();

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Notification Settings</h2>

      {Object.entries(settings).map(([key, value]) => {
        if (typeof value === "boolean") {
          return (
            <div key={key} style={{ margin: "0.5rem 0" }}>
              <label style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => updateSetting(key as any, e.target.checked)}
                  style={{ marginRight: "8px" }}
                />
                {key}
              </label>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export default NotificationSettingsPanel;
