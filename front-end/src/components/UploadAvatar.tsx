import React, { useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import { Button, Slider } from "@mui/material";
import { uploadUserAvatar } from "../utils/uploadUserAvatar";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { UserType } from "../utils/types";
import "./uploadAvatar.css"; // include theme-friendly overrides here

interface Props {
  user: UserType;
  setEditingPicture: (value: boolean) => void;
}

const UploadAvatar: React.FC<Props> = ({ user, setEditingPicture }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scale, setScale] = useState(1.1);
  const editorRef = useRef<AvatarEditor | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!editorRef.current || !selectedFile) return;

    const canvas = editorRef.current.getImageScaledToCanvas();
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const downloadUrl = await uploadUserAvatar(file, user.uid);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profileUrl: downloadUrl });

      setEditingPicture(false);
      window.location.reload(); // or trigger a redux update if you prefer
    }, "image/jpeg");
  };

  return (
    <div className="avatar-upload-container">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="avatar-file-input"
      />

      {selectedFile && (
        <div className="editor-preview-box">
          <AvatarEditor
            ref={editorRef}
            image={selectedFile}
            width={150}
            height={150}
            border={40}
            borderRadius={999}
            color={[255, 255, 255, 0.6]} // background
            scale={scale}
          />
          <div className="scale-slider">
            <Slider
              value={scale}
              min={1}
              max={3}
              step={0.01}
              onChange={(_, value) => setScale(value as number)}
              size="small"
              sx={{ maxWidth: 180 }}
            />
          </div>
          <div className="avatar-button-row">
            <Button
              onClick={handleUpload}
              variant="contained"
              size="small"
              sx={{ fontSize: "0.75rem", backgroundColor: "var(--primary-blue)" }}
            >
              Save Avatar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadAvatar;

