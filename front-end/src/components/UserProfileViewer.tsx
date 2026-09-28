import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import { getAuth, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useSelector } from "react-redux";

import { selectCurrentCompany } from "../Slices/currentCompanySlice";
import { selectUser, updateCurrentUser } from "../Slices/userSlice";
import { useAppConfigSync } from "../hooks/useAppConfigSync";
import { db } from "../utils/firebase";
import { resetApp } from "../utils/resetApp";
import { useAppDispatch } from "../utils/store";
import UploadAvatar from "./UploadAvatar";

import "./userProfileViewer.css";

type ProfileNotice = {
  message: string;
  tone: "success" | "error";
} | null;

const formatRole = (role?: string) => {
  if (!role) return "Team member";

  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const UserProfileViewer = () => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const currentCompany = useSelector(selectCurrentCompany);
  const { localVersion, serverVersion } = useAppConfigSync();

  const [editingDetails, setEditingDetails] = useState(false);
  const [editingPicture, setEditingPicture] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [notice, setNotice] = useState<ProfileNotice>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user?.firstName, user?.lastName]);

  const initials = useMemo(() => {
    const value = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;
    return value.toUpperCase() || "DG";
  }, [user?.firstName, user?.lastName]);

  if (!user) {
    return (
      <div className="profile-page profile-page--loading" aria-live="polite">
        <CircularProgress size={30} />
        <span>Loading your profile…</span>
      </div>
    );
  }

  const displayName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Displaygram user";
  const companyName =
    currentCompany?.companyName || user.company || "No company assigned";
  const roleLabel = formatRole(user.role);
  const versionsLoaded = Boolean(localVersion && serverVersion);
  const appIsCurrent = versionsLoaded && localVersion === serverVersion;

  const cancelEditing = () => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEditingDetails(false);
    setNotice(null);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFirstName = firstName.trim();
    const nextLastName = lastName.trim();

    if (!nextFirstName || !nextLastName) {
      setNotice({
        message: "Enter both your first and last name.",
        tone: "error",
      });
      return;
    }

    if (nextFirstName.length > 60 || nextLastName.length > 60) {
      setNotice({
        message: "Names must be 60 characters or fewer.",
        tone: "error",
      });
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName: nextFirstName,
        lastName: nextLastName,
        updatedAt: serverTimestamp(),
      });

      const authUser = getAuth().currentUser;
      if (authUser) {
        try {
          await updateProfile(authUser, {
            displayName: `${nextFirstName} ${nextLastName}`,
          });
        } catch (authError) {
          console.warn("Profile saved, but the auth display name did not sync.", authError);
        }
      }

      dispatch(
        updateCurrentUser({
          firstName: nextFirstName,
          lastName: nextLastName,
          updatedAt: new Date().toISOString(),
        }),
      );
      setEditingDetails(false);
      setNotice({ message: "Profile details updated.", tone: "success" });
    } catch (error) {
      console.error("Unable to update profile details:", error);
      setNotice({
        message: "We couldn't save those changes. Please try again.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Refresh Displaygram's local data? Your account and cloud data will remain intact, but this device's cached app data will be rebuilt.",
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await resetApp(dispatch);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <main className="profile-page">
      <header className="profile-page__header">
        <div>
          <span className="profile-page__eyebrow">Account</span>
          <h1>Your profile</h1>
          <p>Manage how you appear to your team and review your workspace access.</p>
        </div>
      </header>

      {notice && (
        <div
          className={`profile-notice profile-notice--${notice.tone}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.tone === "success" && <CheckCircleOutlineIcon />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="profile-layout">
        <section className="profile-card profile-identity-card" aria-labelledby="profile-name">
          <div className="profile-avatar-shell">
            <Avatar
              className="profile-avatar"
              src={user.profileUrlThumbnail}
              alt={`${displayName}'s profile`}
            >
              {initials}
            </Avatar>
            <span className="profile-avatar-shell__status" title="Active account" />
          </div>

          <div className="profile-identity-card__copy">
            <h2 id="profile-name">{displayName}</h2>
            <p>{user.email || "No email available"}</p>
          </div>

          <div className="profile-chip-row" aria-label="Workspace identity">
            <span className="profile-chip profile-chip--accent">{roleLabel}</span>
            <span className="profile-chip">{companyName}</span>
          </div>

          <Button
            className="profile-photo-button"
            variant="outlined"
            startIcon={<PhotoCameraOutlinedIcon />}
            onClick={() => {
              setEditingPicture((value) => !value);
              setNotice(null);
            }}
          >
            {editingPicture ? "Close photo editor" : "Change profile photo"}
          </Button>

          {editingPicture && (
            <UploadAvatar
              user={user}
              setEditingPicture={setEditingPicture}
              onStatusChange={(message, tone) => setNotice({ message, tone })}
            />
          )}
        </section>

        <div className="profile-main-column">
          <section className="profile-card profile-details-card" aria-labelledby="personal-details-heading">
            <div className="profile-card__heading">
              <div>
                <span className="profile-card__kicker">Identity</span>
                <h2 id="personal-details-heading">Personal details</h2>
              </div>
              {!editingDetails && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => {
                    setEditingDetails(true);
                    setNotice(null);
                  }}
                >
                  Edit name
                </Button>
              )}
            </div>

            {editingDetails ? (
              <form className="profile-edit-form" onSubmit={handleProfileSubmit}>
                <div className="profile-edit-form__fields">
                  <TextField
                    label="First name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    inputProps={{ maxLength: 60 }}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Last name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    inputProps={{ maxLength: 60 }}
                    required
                    fullWidth
                  />
                </div>
                <div className="profile-edit-form__actions">
                  <Button type="button" onClick={cancelEditing} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="profile-detail-list">
                <div className="profile-detail-row">
                  <span className="profile-detail-row__icon"><AccountCircleOutlinedIcon /></span>
                  <dt>Name</dt>
                  <dd>{displayName}</dd>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-row__icon"><EmailOutlinedIcon /></span>
                  <dt>Email</dt>
                  <dd>{user.email || "Not available"}</dd>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-row__icon"><BusinessOutlinedIcon /></span>
                  <dt>Company</dt>
                  <dd>{companyName}</dd>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-row__icon"><ShieldOutlinedIcon /></span>
                  <dt>Access level</dt>
                  <dd>{roleLabel}</dd>
                </div>
              </dl>
            )}

            <p className="profile-details-card__note">
              Email, company, and access level are managed by your organization.
            </p>
          </section>

          <section className="profile-card profile-health-card" aria-labelledby="app-health-heading">
            <div className="profile-card__heading">
              <div>
                <span className="profile-card__kicker">This device</span>
                <h2 id="app-health-heading">App health</h2>
              </div>
              <span
                className={`profile-health-status ${
                  !versionsLoaded
                    ? "profile-health-status--checking"
                    : appIsCurrent
                      ? "profile-health-status--current"
                      : "profile-health-status--attention"
                }`}
              >
                {!versionsLoaded
                  ? "Checking…"
                  : appIsCurrent
                    ? "Up to date"
                    : "Refresh recommended"}
              </span>
            </div>

            <div className="profile-version-grid">
              <div>
                <span>Local version</span>
                <strong>{localVersion || "Checking"}</strong>
              </div>
              <div>
                <span>Server version</span>
                <strong>{serverVersion || "Checking"}</strong>
              </div>
            </div>

            <div className="profile-health-card__footer">
              <p>
                If information looks stale, rebuild the local cache. Your cloud data and account remain unchanged.
              </p>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<SyncOutlinedIcon />}
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? "Refreshing…" : "Refresh local data"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default UserProfileViewer;
