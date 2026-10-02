import { ChangeEvent, useId, useRef, useState } from "react";
import { Button, Slider } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import AvatarEditor from "react-avatar-editor";
import { doc, updateDoc } from "firebase/firestore";
import { useDispatch } from "react-redux";

import { updateCurrentUser } from "../Slices/userSlice";
import { db } from "../utils/firebase";
import { UserType } from "../utils/types";
import {
  MAX_AVATAR_FILE_SIZE,
  SUPPORTED_AVATAR_TYPES,
  uploadUserAvatar,
} from "../utils/uploadUserAvatar";

import "./uploadAvatar.css";

interface Props {
  user: UserType;
  setEditingPicture: (value: boolean) => void;
  onStatusChange?: (message: string, tone: "success" | "error") => void;
}

const createCroppedBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to prepare the cropped image."));
      },
      "image/jpeg",
      0.9,
    );
  });

const UploadAvatar = ({
  user,
  setEditingPicture,
  onStatusChange,
}: Props) => {
  const dispatch = useDispatch();
  const inputId = useId();
  const editorRef = useRef<AvatarEditor | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scale, setScale] = useState(1.1);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const userRef = doc(db, "users", user.uid);
  const hasAvatar = Boolean(user.profileUrlOriginal || user.profileUrlThumbnail);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setErrorMessage("");

    if (!file) return;

    if (!SUPPORTED_AVATAR_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setErrorMessage("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setSelectedFile(null);
      setErrorMessage("Choose an image smaller than 8 MB.");
      return;
    }

    setSelectedFile(file);
    setScale(1.1);
  };

  const handleUpload = async () => {
    if (!editorRef.current || !selectedFile || isWorking) return;

    setIsWorking(true);
    setErrorMessage("");

    try {
      const canvas = editorRef.current.getImageScaledToCanvas();
      const croppedBlob = await createCroppedBlob(canvas);
      const avatarData = await uploadUserAvatar(
        selectedFile,
        croppedBlob,
        user.uid,
      );

      await updateDoc(userRef, avatarData);
      dispatch(updateCurrentUser(avatarData));
      onStatusChange?.("Profile photo updated.", "success");
      setEditingPicture(false);
    } catch (error) {
      console.error("Unable to update profile photo:", error);
      setErrorMessage("We couldn't save that photo. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!hasAvatar || isWorking) return;

    const confirmed = window.confirm("Remove your current profile photo?");
    if (!confirmed) return;

    setIsWorking(true);
    setErrorMessage("");

    try {
      const clearedAvatar = {
        profileUrlOriginal: null,
        profileUrlThumbnail: null,
      };
      await updateDoc(userRef, clearedAvatar);
      dispatch(updateCurrentUser(clearedAvatar));
      onStatusChange?.("Profile photo removed.", "success");
      setEditingPicture(false);
    } catch (error) {
      console.error("Unable to remove profile photo:", error);
      setErrorMessage("We couldn't remove that photo. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="avatar-upload-container">
      <div className="avatar-upload-container__header">
        <strong>Profile photo</strong>
        <span>JPG, PNG, or WebP · 8 MB maximum</span>
      </div>

      <input
        id={inputId}
        type="file"
        accept={SUPPORTED_AVATAR_TYPES.join(",")}
        onChange={handleFileChange}
        className="avatar-file-input"
        disabled={isWorking}
      />

      {!selectedFile && (
        <label className="avatar-file-label" htmlFor={inputId}>
          <FileUploadOutlinedIcon />
          Choose image
        </label>
      )}

      {selectedFile && (
        <div className="editor-preview-box">
          <AvatarEditor
            ref={editorRef}
            image={selectedFile}
            width={180}
            height={180}
            border={32}
            borderRadius={999}
            color={[8, 21, 33, 0.72]}
            scale={scale}
          />

          <label className="avatar-scale-control">
            <span>Zoom</span>
            <Slider
              value={scale}
              min={1}
              max={3}
              step={0.01}
              onChange={(_, value) => setScale(value as number)}
              size="small"
              disabled={isWorking}
            />
          </label>

          <div className="avatar-button-row">
            <Button
              onClick={handleUpload}
              variant="contained"
              size="small"
              disabled={isWorking}
            >
              {isWorking ? "Saving…" : "Save photo"}
            </Button>
            <Button
              onClick={() => {
                setSelectedFile(null);
                setErrorMessage("");
              }}
              variant="text"
              size="small"
              disabled={isWorking}
            >
              Choose another
            </Button>
          </div>
        </div>
      )}

      {hasAvatar && !selectedFile && (
        <Button
          className="avatar-remove-button"
          onClick={handleRemoveAvatar}
          variant="text"
          color="error"
          size="small"
          startIcon={<DeleteOutlineIcon />}
          disabled={isWorking}
        >
          {isWorking ? "Removing…" : "Remove current photo"}
        </Button>
      )}

      {errorMessage && (
        <p className="avatar-upload-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default UploadAvatar;
