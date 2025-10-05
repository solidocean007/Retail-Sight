// CreatePost.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// import { Timestamp } from "firebase/firestore";
import { selectUser } from "../../Slices/userSlice";

// import ChannelSelector from "./ChannelSelector";
// import CategorySelector from "./CategorySelector";
import { AppBar, Box, Container } from "@mui/material";

// import StoreLocator from "./StoreLocator";
import { useHandlePostSubmission } from "../../utils/PostLogic/handlePostCreation";
import {
  CompanyAccountType,
  FireStoreGalloGoalDocType,
  PostInputType,
  PostType,
  UserType,
} from "../../utils/types";
// import { CategoryType } from "./CategorySelector";
// import { ChannelType } from "./ChannelSelector";
// import { SupplierType } from "./SupplierSelector";
// import { BrandType } from "./BrandsSelector";
import "./createPost.css";
import { CreatePostHelmet } from "../../utils/helmetConfigurations";
import { UploadImage } from "./UploadImage";
import { PickStore } from "./PickStore";
import { SetDisplayDetails } from "./SetDisplayDetails";
import { DisplayDescription } from "./DisplayDescription";
import { ReviewAndSubmit } from "./ReviewAndSubmit";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import CreatePostOnBehalfOfOtherUser from "./CreatePostOnBehalfOfOtherUser";
import { CancelRounded } from "@mui/icons-material";
import { useIntegrations } from "../../hooks/useIntegrations";
import { mergeAndSetPosts } from "../../Slices/postsSlice";
import { normalizePost } from "../../utils/normalizePost";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";

export const CreatePost = () => {
  const userData = useSelector(selectUser);
  const dispatch = useAppDispatch();
  const companyId = userData?.companyId;
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");
  const [galloAxisApiKey, setGalloAxisApiKey] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  const handlePostSubmission = useHandlePostSubmission();

  const [onBehalf, setOnBehalf] = useState<UserType | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [selectedCompanyAccount, setSelectedCompanyAccount] = // selectedCompanyAccount isnt used...
    useState<CompanyAccountType | null>(null);

  const [post, setPost] = useState<PostInputType>(() => ({
    brands: [],
    productType: [],
    description: "",
    imageUrl: "",
    totalCaseCount: 0,
    // visibility: "company",
    migratedVisibility: "network",
    postUser: userData || null,
    account: null,
  }));
  const [selectedGalloGoal, setSelectedGalloGoal] =
    useState<FireStoreGalloGoalDocType | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setPost((prevPost) => ({
      ...prevPost,
      postUser: onBehalf ?? userData, // 👤 Who the post is for
      postedBy: userData ?? null, // 🧑‍💻 Who is submitting the post
      postedByFirstName: userData?.firstName || null,
      postedByLastName: userData?.lastName || null,
      postedByUid: userData?.uid || null,
    }));
  }, [onBehalf, userData]);

  const handleTotalCaseCountChange = useCallback((caseCount: number) => {
    setPost((prev) => ({ ...prev, totalCaseCount: caseCount }));
  }, []);

  // Update this to handle all field changes generically, including channel and category
  const handleFieldChange = useCallback(
    (field: keyof PostType, value: PostType[keyof PostType]) => {
      setPost((prevPost) => ({
        ...prevPost,
        [field]: value,
      }));
    },
    []
  );

  const isStep1Valid = !!selectedFile; // UploadImage picked a file
  const isStep2Valid = !!post.account; // PickStore chose an account
  const isStep3Valid =
    (post.brands?.length || 0) > 0 && (post.productType?.length || 0) > 0; // SetDisplayDetails
  const isStep4Valid = true; // DisplayDescription is optional

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return isStep1Valid;
      case 2:
        return isStep2Valid;
      case 3:
        return isStep3Valid;
      case 4:
        return isStep4Valid;
      default:
        return true; // Review/Submit step swaps to Submit
    }
  }, [currentStep, isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid]);

  // Render different content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <UploadImage
            setSelectedFile={setSelectedFile}
            post={post}
            setPost={setPost}
          />
        );
      case 2:
        return (
          <PickStore
            post={post}
            setPost={setPost}
            handleFieldChange={handleFieldChange}
            setSelectedCompanyAccount={setSelectedCompanyAccount}
            setSelectedGalloGoal={setSelectedGalloGoal}
          />
        );
      case 3:
        return (
          <SetDisplayDetails
            post={post}
            setPost={setPost}
            handleTotalCaseCountChange={handleTotalCaseCountChange}
          />
        );
      case 4:
        return (
          <DisplayDescription
            post={post}
            handleFieldChange={handleFieldChange}
          />
        );
      default:
        return (
          <ReviewAndSubmit
            companyId={companyId}
            post={post}
            handleFieldChange={handleFieldChange}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            uploadProgress={uploadProgress}
            uploadStatusText={uploadStatusText}
          />
        );
    }
  };

  const authToCreateOnBehalf =
    userData?.role === "admin" ||
    userData?.role === "super-admin" ||
    userData?.role === "employee";

  const appBarStyle = {
    width: "100%",
    display: "flex",
    // justifyContent: "space-between",
    flexDirection: { sm: "row", md: "row" },
  };

  const handleSubmitClick = async () => {
    if (!selectedFile) {
      dispatch(showMessage("Please select an image before submitting."));
      return;
    }

    // setIsSubmitting(true);
    setUploadProgress(0);
    setIsUploading(true);

    try {
      // 🔒 Gate gallo args right here
      const galloApiKey = galloEnabled ? galloAxisApiKey : undefined;
      const galloGoal = galloEnabled ? selectedGalloGoal : undefined;
      const newPost = await handlePostSubmission(
        post,
        selectedFile,
        setIsUploading,
        setUploadProgress,
        setUploadStatusText,
        galloApiKey,
        galloGoal
      );
      dispatch(mergeAndSetPosts([normalizePost(newPost)]));
      navigate("/user-home-page");
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(err.message || "An error occurred during upload.");
    } 
  };

  // ❗ reset apiKey if feature is turned off while component is mounted
  useEffect(() => {
    if (!galloEnabled && galloAxisApiKey) setGalloAxisApiKey("");
  }, [galloEnabled, galloAxisApiKey]);

  // fetch external API key only when needed (and enabled)
  useEffect(() => {
    // needs: feature on, company present, an oppId present, and we don't already have a key
    if (!galloEnabled) return;
    if (!companyId || !post.oppId) return;
    if (galloAxisApiKey) return;

    fetchExternalApiKey(companyId, "galloApiKey")
      .then((key) => setGalloAxisApiKey(key))
      .catch(() => {
        console.error("Failed to fetch API key");
        dispatch(showMessage("Failed to fetch API key."));
      });
  }, [galloEnabled, companyId, post.oppId, galloAxisApiKey, dispatch]);

  return (
    <>
      <CreatePostHelmet />
      <Container disableGutters className="create-post-container">
        <AppBar position="static" sx={appBarStyle}>
          <div className="create-post-header">
            <h1 style={{ marginLeft: "2rem" }}>Create Post</h1>
            <button
              className="close-button"
              aria-label="close"
              onClick={() => navigate("/user-home-page")}
            >
              <CancelRounded />
            </button>
          </div>
        </AppBar>
        <div className="create-post-body">
          {authToCreateOnBehalf && (
            <CreatePostOnBehalfOfOtherUser
              onBehalf={onBehalf}
              setOnBehalf={setOnBehalf}
              handleFieldChange={handleFieldChange}
            />
          )}
          {/* Sticky footer */}
          <div className="create-post-navigation">
            <button
              className="btn-secondary"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep === 1 || isUploading}
            >
              Back
            </button>

            <button
              type="button"
              className={canGoNext ? "button-primary" : "btn-disabled"}
              onClick={() => {
                if (currentStep < 5) setCurrentStep((s) => s + 1);
                else handleSubmitClick();
              }}
              disabled={isUploading || (currentStep < 5 && !canGoNext)}
            >
              {currentStep < 5
                ? "Next"
                : isUploading
                ? `Uploading ${Math.round(uploadProgress)}%`
                : "Submit"}
            </button>
          </div>

          {renderStepContent()}
        </div>
      </Container>
    </>
  );
};
