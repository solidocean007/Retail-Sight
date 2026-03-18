import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress } from "@mui/material";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useSelector } from "react-redux";
import "./accountImportNotificationSettings.css";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { db } from "../../utils/firebase";

interface Props {
  companyId: string | undefined;
}

const AccountImportNotificationSettings: React.FC<Props> = ({ companyId }) => {
  const users = useSelector(selectCompanyUsers);
  const admins = users?.filter((u) => u.role?.includes("admin")) || [];

  const [loading, setLoading] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if(!companyId) return;
    const loadSettings = async () => {
      const ref = doc(db, "companies", companyId, "settings", "accountImports");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setNotifyEnabled(!!snap.data()?.notifyOnImport);
        setEmails(snap.data()?.notificationEmails ?? []);
      }

      setLoading(false);
    };

    loadSettings();
  }, [companyId]);

  const saveSettings = async () => {
    setSaving(true);
    if(!companyId) return;
    try {
      await setDoc(
        doc(db, "companies", companyId, "settings", "accountImports"),
        {
          notifyOnImport: notifyEnabled,
          notificationEmails: emails.filter(Boolean),
        },
        { merge: true },
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="account-import-panel">
        <CircularProgress />
      </Container>
    );
  }

  
  return (
    <section className="account-import-panel">
      <header className="panel-header">
        <Typography variant="h5">Account Import Notifications</Typography>
      </header>
      <header className="panel-header">
        <div className="header-main">
          <div
            className={`status-pill ${notifyEnabled ? "success" : "disabled"}`}
          >
            {notifyEnabled ? "Notifications Enabled" : "Notifications Disabled"}
          </div>
        </div>
      </header>

      <section className="notify-section">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={notifyEnabled}
            onChange={(e) => setNotifyEnabled(e.target.checked)}
          />
          Email admins when new account imports require review
        </label>

        {notifyEnabled && (
          <>
            <div className="admin-email-list">
              {admins
                .filter((u): u is typeof u & { email: string } =>
                  Boolean(u.email),
                )
                .map((u) => {
                  const checked = emails.includes(u.email);

                  return (
                    <label key={u.uid} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setEmails((prev) =>
                            checked
                              ? prev.filter((e) => e !== u.email)
                              : [...prev, u.email],
                          );
                        }}
                      />

                      <span>
                        {u.firstName} {u.lastName}
                        <small className="muted"> ({u.email})</small>
                      </span>
                    </label>
                  );
                })}
            </div>

            <button
              className="btn-secondary save-notify-settings"
              disabled={saving}
              onClick={saveSettings}
            >
              {saving ? "Saving…" : "Save Notification Settings"}
            </button>

            <small className="helper-text">
              A notification email will be sent when new account imports are
              detected and waiting for admin review.
            </small>
          </>
        )}
      </section>
    </section>
  );
};

export default AccountImportNotificationSettings;
