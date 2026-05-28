import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useSelector } from "react-redux";
import "./accountImportNotificationSettings.css";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { db } from "../../utils/firebase";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";

interface Props {
  companyId: string | undefined;
  defaultOpen?: boolean;
}

const AccountImportNotificationSettings: React.FC<Props> = ({
  companyId,
  defaultOpen = false,
}) => {
  const dispatch = useAppDispatch();
  const users = useSelector(selectCompanyUsers);

  const admins = useMemo(
    () =>
      (users || []).filter(
        (u) =>
          Boolean(u.email) &&
          (u.role === "admin" ||
            u.role === "super-admin" ||
            u.role?.includes("admin")),
      ),
    [users],
  );

  const [expanded, setExpanded] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      setLoading(true);

      try {
        const ref = doc(
          db,
          "companies",
          companyId,
          "settings",
          "accountImports",
        );
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setNotifyEnabled(Boolean(data.notifyOnImport));
          setEmails(data.notificationEmails ?? []);
        }
      } catch (err) {
        console.error(
          "Failed to load account import notification settings:",
          err,
        );
        dispatch(showMessage("Failed to load account notification settings."));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [companyId, dispatch]);

  const toggleAdminEmail = (email: string) => {
    setEmails((prev) =>
      prev.includes(email)
        ? prev.filter((item) => item !== email)
        : [...prev, email],
    );
  };

  const saveSettings = async () => {
    if (!companyId) {
      dispatch(showMessage("Missing company ID."));
      return;
    }

    setSaving(true);

    try {
      await setDoc(
        doc(db, "companies", companyId, "settings", "accountImports"),
        {
          notifyOnImport: notifyEnabled,
          notificationEmails: notifyEnabled ? emails.filter(Boolean) : [],
        },
        { merge: true },
      );

      dispatch(showMessage("Account import notification settings saved."));
      setExpanded(false);
    } catch (err) {
      console.error(
        "Failed to save account import notification settings:",
        err,
      );
      dispatch(showMessage("Failed to save notification settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="account-import-panel compact">
        <CircularProgress size={20} />
        <span>Loading notification settings…</span>
      </section>
    );
  }

  return (
    <section className="account-import-panel">
      <div className="account-import-summary-row">
        <div>
          <strong>Email admins when account imports are available</strong>
          <p>
            {notifyEnabled
              ? `${emails.length} recipient${emails.length === 1 ? "" : "s"} selected.`
              : "Notifications are currently disabled."}
          </p>
        </div>

        <div className="account-import-summary-actions">
          <span
            className={`status-pill ${notifyEnabled ? "success" : "disabled"}`}
          >
            {notifyEnabled ? "Enabled" : "Disabled"}
          </span>

          <button
            type="button"
            className="btn-outline"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Close" : "Manage"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="account-import-settings-body">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
            />
            <span>
              Send email notifications when new account imports need review
            </span>
          </label>

          {notifyEnabled && (
            <>
              <div className="admin-email-list">
                {admins.length === 0 ? (
                  <p className="helper-text">
                    No admin users with email addresses found.
                  </p>
                ) : (
                  admins.map((u) => {
                    const email = u.email as string;
                    const checked = emails.includes(email);

                    return (
                      <label key={u.uid} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAdminEmail(email)}
                        />

                        <span>
                          {u.firstName} {u.lastName}
                          <small className="muted"> ({email})</small>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <small className="helper-text">
                These users will receive an email when account changes are
                detected and waiting for review.
              </small>
            </>
          )}

          <div className="account-import-actions">
            <button
              type="button"
              className="btn-secondary save-notify-settings"
              disabled={saving}
              onClick={saveSettings}
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AccountImportNotificationSettings;
