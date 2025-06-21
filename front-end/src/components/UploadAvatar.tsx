// UploadAvatar.tsx
import React, { useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import { Button, Slider, Stack } from "@mui/material";
import { uploadUserAvatar } from "../utils/uploadUserAvatar";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { UserType } from "../utils/types";
import "./uploadAvatar.css";
import { useDispatch } from "react-redux";
import { updateCurrentUser } from "../Slices/userSlice";

interface Props {
  user: UserType;
  setEditingPicture: (value: boolean) => void;
}

const UploadAvatar: React.FC<Props> = ({ user, setEditingPicture }) => {
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scale, setScale] = useState(1.1);
  const editorRef = useRef<AvatarEditor | null>(null);

  // reference to your user document
  const userRef = doc(db, "users", user.uid);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!editorRef.current || !selectedFile) return;
    const canvas = editorRef.current.getImageScaledToCanvas();
    canvas.toBlob(async (croppedBlob) => {
      if (!croppedBlob) return;
      const avatarData = await uploadUserAvatar(
        selectedFile,
        croppedBlob,
        user.uid
      );

      // save both original & thumbnail
      await updateDoc(userRef, {
        profileUrlOriginal: avatarData.profileUrlOriginal,
        profileUrlThumbnail: avatarData.profileUrlThumbnail,
      });

      dispatch(
        updateCurrentUser({
          profileUrlOriginal: avatarData.profileUrlOriginal,
          profileUrlThumbnail: avatarData.profileUrlThumbnail,
        })
      );

      setEditingPicture(false);
    }, "image/jpeg");
  };

  const handleRemoveAvatar = async () => {
    // clear both fields so you revert to initials/default
    await updateDoc(userRef, {
      profileUrlOriginal: null,
      profileUrlThumbnail: null,
    });
    dispatch(updateCurrentUser({ profileUrlOriginal: null, profileUrlThumbnail: null }));
    setEditingPicture(false);
  };

  return (
    <div className="avatar-upload-container">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="avatar-file-input"
      />

      {selectedFile ? (
        <div className="editor-preview-box">
          <AvatarEditor
            ref={editorRef}
            image={selectedFile}
            width={150}
            height={150}
            border={40}
            borderRadius={999}
            color={[255, 255, 255, 0.6]}
            scale={scale}
          />
          <Slider
            value={scale}
            min={1}
            max={3}
            step={0.01}
            onChange={(_, v) => setScale(v as number)}
            size="small"
            sx={{ maxWidth: 180, mt: 2 }}
          />
          <Stack direction="row" spacing={1} mt={2}>
            <Button
              onClick={handleUpload}
              variant="contained"
              size="small"
              sx={{ fontSize: "0.75rem" }}
            >
              Save Avatar
            </Button>
            <Button
              onClick={() => setSelectedFile(null)}
              variant="outlined"
              size="small"
              sx={{ fontSize: "0.75rem" }}
            >
              Cancel
            </Button>
          </Stack>
        </div>
      ) : (
        <Stack direction="row" spacing={1} mt={2}>
          <Button
            onClick={handleRemoveAvatar}
            variant="outlined"
            color="error"
            size="small"
            sx={{ fontSize: "0.75rem" }}
          >
            Remove Avatar
          </Button>
        </Stack>
      )}
    </div>
  );
};

export default UploadAvatar;
