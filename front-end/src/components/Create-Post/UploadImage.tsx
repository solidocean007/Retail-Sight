import { CircularProgress } from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { PostInputType } from "../../utils/types";
import "./uploadimage.css";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import heic2any from "heic2any";
import { useState } from "react";
import { Photo } from "@mui/icons-material";

interface UploadImageProps {
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
}

export const UploadImage: React.FC<UploadImageProps> = ({
  setSelectedFile,
  post,
  setPost,
}) => {
  const dispatch = useAppDispatch();
  const [isConverting, setIsConverting] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      dispatch(showMessage("No file selected. Please choose an image."));
      return;
    }

    try {
      // 🛡 Force file copy into memory immediately
      const arrayBuffer = await file.arrayBuffer();
      const copiedFile = new File([arrayBuffer], file.name, {
        type: file.type,
      });

      if (!copiedFile || copiedFile.size === 0) {
        throw new Error("File reference lost after selection.");
      }

      // 🛡 Double check for stale gallery files
      if (
        typeof copiedFile.lastModified === "undefined" ||
        copiedFile.size === 0
      ) {
        dispatch(
          showMessage(
            "This photo cannot be accessed. Try re-selecting it using 'Browse' or take a new photo."
          )
        );
        return;
      }

      setSelectedFile(copiedFile);

      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
      ];

      if (!validImageTypes.includes(copiedFile.type)) {
        dispatch(
          showMessage("Unsupported file type. Please upload JPG or PNG.")
        );
        return;
      }

      // 🖼 Handle HEIC/HEIF conversion
      if (
        copiedFile.type.includes("heic") ||
        copiedFile.type.includes("heif")
      ) {
        dispatch(showMessage("Converting HEIC image, please wait..."));
        setIsConverting(true);

        const convertedBlob = await heic2any({
          blob: copiedFile,
          toType: "image/jpeg",
        });

        const singleBlob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;

        const convertedFile = new File(
          [singleBlob],
          file.name.replace(/\.\w+$/, ".jpg"),
          { type: "image/jpeg" }
        );

        // 🛡 Force converted file into memory
        const convertedArrayBuffer = await convertedFile.arrayBuffer();
        const copiedConvertedFile = new File(
          [convertedArrayBuffer],
          convertedFile.name,
          { type: convertedFile.type }
        );

        if (!copiedConvertedFile || copiedConvertedFile.size === 0) {
          throw new Error("Converted file inaccessible.");
        }

        setSelectedFile(copiedConvertedFile);

        const reader = new FileReader();
        reader.onloadend = () => {
          setPost({ ...post, imageUrl: reader.result as string });
          dispatch(showMessage("Image converted and selected successfully!"));
        };
        reader.readAsDataURL(copiedConvertedFile);
        return;
      }

      // 🖼 Regular images
      const reader = new FileReader();
      reader.onloadend = () => {
        setPost({ ...post, imageUrl: reader.result as string });
        dispatch(showMessage("Image selected successfully!"));
      };
      reader.readAsDataURL(copiedFile);
    } catch (err: any) {
      console.error("Error handling image selection:", err);
      dispatch(
        showMessage(
          "This photo could not be accessed. Try re-selecting it using 'Browse' or take a new photo."
        )
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="image-selection-box" style={{ position: "relative" }}>
      {!post.imageUrl && (
        <div className="step-one">
          <h4>1st add picture</h4>
        </div>
      )}

      <div className="upload-buttons">
        <button className="upload-button btn-outline">
          <label>
            <AddAPhotoIcon /> Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onClick={(e) => (e.currentTarget.value = "")}
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </label>
        </button>
        <button className="upload-button btn-outline">
          <label>
            <Photo /> Select Photo
            <input
              type="file"
              accept="image/*"
              onClick={(e) => (e.currentTarget.value = "")}
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </label>
        </button>
      </div>

      {post.imageUrl && (
        <>
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
          <h4 style={{ marginTop: "1rem" }}>
            Converting image, please wait...
          </h4>
        </div>
      )}
    </div>
  );
};
