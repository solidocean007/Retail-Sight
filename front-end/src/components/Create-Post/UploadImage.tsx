import { useEffect, useState } from "react";
import { CircularProgress } from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { Photo } from "@mui/icons-material";
import heic2any from "heic2any";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { httpsCallable, getFunctions } from "firebase/functions";
import { storage } from "../../utils/firebase";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import { PostInputType } from "../../utils/types";
import "./uploadimage.css";

interface UploadImageProps {
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  isAiFeatureEnabled?: boolean; // ✅ control default AI toggle from plan
  setUserLocation: React.Dispatch<
    React.SetStateAction<{
      lat: number;
      lng: number;
    } | null>
  >;
}

export const UploadImage: React.FC<UploadImageProps> = ({
  setSelectedFile,
  post,
  setPost,
  isAiFeatureEnabled = true, // free-tier companies can disable by default
  setUserLocation,
}) => {
  const dispatch = useAppDispatch();
  const functions = getFunctions();

  const [isConverting, setIsConverting] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(isAiFeatureEnabled);
  const [showAiInfo, setShowAiInfo] = useState(false);

  useEffect(() => {
    setPost((prev) => ({
      ...prev,
      aiEnabled: isAiEnabled,
    }));
  }, [isAiEnabled]);

  // ----------------------------
  // 📸 HANDLE IMAGE UPLOAD
  // ----------------------------
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      dispatch(showMessage("No file selected. Please choose an image."));
      return;
    }

    try {
      // Force memory copy
      const arrayBuffer = await file.arrayBuffer();
      let finalFile = new File([arrayBuffer], file.name, { type: file.type });

      if (!finalFile || finalFile.size === 0) {
        throw new Error("File reference lost after selection.");
      }

      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
      ];
      if (!validImageTypes.includes(finalFile.type)) {
        dispatch(
          showMessage("Unsupported file type. Please upload JPG or PNG.")
        );
        return;
      }

      // Convert HEIC if needed
      if (finalFile.type.includes("heic") || finalFile.type.includes("heif")) {
        dispatch(showMessage("Converting HEIC image, please wait..."));
        setIsConverting(true);

        const convertedBlob = await heic2any({
          blob: finalFile,
          toType: "image/jpeg",
        });
        const singleBlob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;
        finalFile = new File(
          [singleBlob],
          file.name.replace(/\.\w+$/, ".jpg"),
          {
            type: "image/jpeg",
          }
        );
      }

      // Show preview
      const reader = new FileReader();
      reader.onloadend = async () => {
        const preview = reader.result as string;
        setPost((prev) => ({ ...prev, imageUrl: preview }));
        setSelectedFile(finalFile);
        dispatch(showMessage("Image selected successfully!"));

        // ---------------------------------
        // 🤖 AI DETECTION (optional)
        // ---------------------------------
        if (!post.aiEnabled) {
          console.log("🧠 AI detection disabled — skipping analyze step.");
          setPost((prev) => ({
            ...prev,
            autoDetectedBrands: [],
            rawCandidates: [],
          }));
          return;
        }

        try {
          const path = `tempUploads/${Date.now()}_${finalFile.name}`;
          const imageRef = ref(storage, path);
          await uploadBytes(imageRef, finalFile);
          const url = await getDownloadURL(imageRef);
          console.log("✅ Uploaded for detection:", url);

          const detectFn = httpsCallable(functions, "detectBrands");
          const res: any = await detectFn({ imageUrl: url });

          const detected = res.data?.detectedBrands || [];
          const rawCandidates = res.data?.rawCandidates || [];

          console.log("🧠 AI detected brands:", detected);
          console.log("📊 Vision raw text:", rawCandidates);

          setPost((prev) => ({
            ...prev,
            autoDetectedBrands: detected,
            rawCandidates,
          }));

          // ✅ Improved message logic
          if (Array.isArray(detected) && detected.length > 0) {
            dispatch(
              showMessage(
                `✅ AI detected ${detected.length} brand${
                  detected.length > 1 ? "s" : ""
                } automatically.`
              )
            );
          } else if (Array.isArray(rawCandidates) && rawCandidates.length > 0) {
            dispatch(
              showMessage(
                "🤖 AI found text in the image — you can review suggestions on the next step."
              )
            );
          } else {
            dispatch(
              showMessage("AI could not find any text or brands in this image.")
            );
          }
        } catch (err) {
          console.error("🚨 AI detection failed:", err);
          dispatch(showMessage("AI detection failed — continuing without it."));
        }
      };

      reader.readAsDataURL(finalFile);
    } catch (err) {
      console.error("Error handling image:", err);
      dispatch(
        showMessage("This photo could not be processed. Try selecting again.")
      );
    } finally {
      setIsConverting(false);
    }
  };

  // ----------------------------
  // 🧩 RENDER
  // ----------------------------
  return (
    <div className="image-selection-box" style={{ position: "relative" }}>
      {!post.imageUrl && (
        <div className="step-one">
          <h4>1st add picture</h4>
        </div>
      )}

      {/* 🧠 AI BRAND DETECTION FEATURE BOX */}
      <div className={`ai-detection-card ${isAiEnabled ? "glow-active" : ""}`}>
        <div className="ai-detection-header">
          <div className="ai-learnmore">
            {showAiInfo && (
              <div className="ai-info-modal">
                <div className="ai-info-content">
                  <h4>How AI Brand Detection Works</h4>
                  <p>
                    Displaygram uses secure image-recognition technology powered
                    by Google Cloud Vision to detect brand names and logos in
                    your display photos. Only the image you upload is analyzed —
                    no personal data is shared or stored.
                  </p>
                  <p>
                    The AI suggests brands automatically, but you always have
                    full control to review, change, or remove them before
                    posting.
                  </p>
                  <button
                    className="btn-outline"
                    onClick={() => setShowAiInfo(false)}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="ai-icon">🧠</span>
          <span className="ai-title">AI Brand Detection</span>
          <span className="ai-badge">Beta</span>
        </div>

        <label className="ai-toggle-label">
          <input
            type="checkbox"
            checked={isAiEnabled}
            onChange={(e) => setIsAiEnabled(e.target.checked)}
            className="ai-checkbox"
          />
          <span className="ai-toggle-text">
            Automatically identify brands in display photos
          </span>
        </label>

        <p className="ai-note">
          Helps tag your display with matching brands automatically. You can
          still edit results manually. This is in development. You can turn it
          off.
        </p>
        <button
          className="ai-info-button"
          type="button"
          onClick={() => setShowAiInfo(true)}
        >
          ⓘ Learn More
        </button>
      </div>

      {/* 📸 Upload buttons */}
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

      {/* 🖼 Preview */}
      {post.imageUrl && (
        <div className="image-box">
          <img src={post.imageUrl} alt="Post" className="post-image" />
        </div>
      )}

      {/* 🔄 Loading overlay */}
      {isConverting && (
        <div className="loading-overlay">
          <CircularProgress />
          <h4 style={{ marginTop: "1rem" }}>Processing image…</h4>
        </div>
      )}
    </div>
  );
};
