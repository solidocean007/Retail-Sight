import { Button, CircularProgress } from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { PostType } from "../../utils/types";
import "./uploadimage.css";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import heic2any from "heic2any";
import { useState } from "react";

interface UploadImageProps {
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>;
  onNext: () => void;
}

export const UploadImage: React.FC<UploadImageProps> = ({
  setSelectedFile,
  post,
  setPost,
  onNext,
}) => {
  const dispatch = useAppDispatch();
  const [isConverting, setIsConverting] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file) {
      dispatch(showMessage("No file selected. Please choose an image."));
      return;
    }

    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
    ];

    if (!validImageTypes.includes(file.type)) {
      dispatch(showMessage("Unsupported file type. Please upload JPG or PNG."));
      return;
    }

    if (file.type === "image/heic" || file.type === "image/heif") {
      dispatch(showMessage("Converting HEIC image, please wait..."));
      setIsConverting(true);
      try {
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg" });
        const singleBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const convertedFile = new File(
          [singleBlob],
          file.name.replace(/\.\w+$/, ".jpg"),
          { type: "image/jpeg" }
        );
        const reader = new FileReader();
        reader.onloadend = () => {
          setPost({ ...post, imageUrl: reader.result as string });
          dispatch(showMessage("Image converted and selected successfully!"));
        };
        reader.readAsDataURL(convertedFile);
      } catch (error) {
        console.error("Error converting HEIC/HEIF image:", error);
        dispatch(
          showMessage(
            "Failed to convert HEIC/HEIF image. Please screenshot or save it as JPG/PNG and try again."
          )
        );
      } finally {
        setIsConverting(false);
        return;
      }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPost({ ...post, imageUrl: reader.result as string });
      dispatch(showMessage("Image selected successfully!"));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="image-selection-box" style={{ position: "relative" }}>
      {!post.imageUrl && (
        <div className="step-one">
          <h4>1st add picture</h4>
        </div>
      )}

      <Button
        variant="contained"
        component="label"
        startIcon={<AddAPhotoIcon />}
        disabled={isConverting}
      >
        {post.imageUrl ? "Change Image" : "Upload Image"}
        <input
          type="file"
          hidden
          onChange={handleImageChange}
          accept="image/*"
        />
      </Button>

      {post.imageUrl && (
        <>
          <button className="create-post-btn" onClick={onNext} disabled={isConverting}>
            <h4>Next</h4>
          </button>

          <div className="image-box">
            <img src={post.imageUrl} alt="Post" className="post-image" />
          </div>
        </>
      )}

      {isConverting && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 999,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress />
          <h4 style={{ marginTop: "1rem" }}>Converting image, please wait...</h4>
        </div>
      )}
    </div>
  );
};

