import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@mui/material";
import { CancelRounded } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { selectIsSupplier } from "../../Slices/currentCompanySlice";
import { fetchCompanyConnections } from "../../Slices/companyConnectionSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import { selectUser } from "../../Slices/userSlice";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import { CreatePostHelmet } from "../../utils/helmetConfigurations";
import { useHandlePostSubmission } from "../../utils/PostLogic/handlePostCreation";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  CompanyAccountType,
  FireStoreGalloGoalDocType,
  PostInputType,
  UserType,
} from "../../utils/types";
import { canPostOnBehalf } from "../../utils/userData/permissions";
import CreatePostOnBehalfOfOtherUser from "../Create-Post/CreatePostOnBehalfOfOtherUser";
import { DisplayDescription } from "../Create-Post/DisplayDescription";
import { PickStore } from "../Create-Post/PickStore";
import { ReviewAndSubmit } from "../Create-Post/ReviewAndSubmit";
import { SetDisplayDetails } from "../Create-Post/SetDisplayDetails";
import { UploadImage } from "../Create-Post/UploadImage";
import { useEarlyStorePrefetch } from "../Create-Post/useEarlyStorePrefetch";
import CustomConfirmation from "../CustomConfirmation";
import TotalCaseCount from "../TotalCaseCount";

import "./createPost.css";

const steps = [
  { label: "Photo", helper: "Capture the display" },
  { label: "Store", helper: "Confirm the account" },
  { label: "Details", helper: "Describe what is on display" },
  { label: "Review", helper: "Check and publish" },
] as const;

const CreatePost = () => {
  const userData = useSelector(selectUser);
  const isSupplier = useSelector(selectIsSupplier);
  const connections = useSelector(
    (state: RootState) => state.companyConnections.connections,
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const companyId = userData?.companyId;
  const { isEnabled } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const handlePostSubmission = useHandlePostSubmission();

  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false);
  const [quantityConfirmationOpen, setQuantityConfirmationOpen] = useState(false);
  const [quantityWasEdited, setQuantityWasEdited] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [onBehalf, setOnBehalf] = useState<UserType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setSelectedCompanyAccount] =
    useState<CompanyAccountType | null>(null);
  const [selectedGalloGoal, setSelectedGalloGoal] =
    useState<FireStoreGalloGoalDocType | null>(null);
  const [post, setPost] = useState<PostInputType>(() => ({
    brands: [],
    brandIds: [],
    productType: [],
    description: "",
    imageUrl: "",
    totalCaseCount: 0,
    migratedVisibility: "network",
    postUser: userData || null,
    account: null,
  }));

  const storePrefetch = useEarlyStorePrefetch({ userLocation });

  useEffect(() => {
    if (isSupplier && companyId && connections.length === 0) {
      dispatch(fetchCompanyConnections(companyId));
    }
  }, [isSupplier, companyId, connections.length, dispatch]);

  useEffect(() => {
    if (userLocation || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
      },
      (error) => {
        console.warn("CreatePost location lookup failed:", error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [userLocation]);

  useEffect(() => {
    setPost((previous) => ({
      ...previous,
      postUser: onBehalf ?? userData,
      postedBy: userData ?? null,
      postedByFirstName: userData?.firstName || null,
      postedByLastName: userData?.lastName || null,
      postedByUid: userData?.uid || null,
    }));
  }, [onBehalf, userData]);

  const handleTotalCaseCountChange = useCallback((caseCount: number) => {
    setPost((previous) => ({ ...previous, totalCaseCount: caseCount }));
    setQuantityWasEdited(true);
  }, []);

  const handleFieldChange = useCallback(
    <K extends keyof PostInputType>(field: K, value: PostInputType[K]) => {
      setPost((previous) => ({
        ...previous,
        [field]: value,
      }));
    },
    [],
  );

  const stepValidity = useMemo(
    () => ({
      1: !!selectedFile,
      2:
        !!post.account &&
        (!isSupplier ||
          (!!post.account.originCompanyId &&
            connections.some(
              (connection) =>
                connection.status === "approved" &&
                [
                  connection.requestFromCompanyId,
                  connection.requestToCompanyId,
                ].includes(companyId || "") &&
                [
                  connection.requestFromCompanyId,
                  connection.requestToCompanyId,
                ].includes(post.account?.originCompanyId || ""),
            ))),
      3:
        (post.brands?.length || 0) > 0 &&
        (post.productType?.length || 0) > 0,
      4: true,
    }),
    [
      companyId,
      connections,
      isSupplier,
      post.account,
      post.brands,
      post.productType,
      selectedFile,
    ],
  );

  const canGoNext = stepValidity[currentStep as keyof typeof stepValidity];
  const hasDraft =
    !!selectedFile ||
    !!post.account ||
    (post.brands?.length || 0) > 0 ||
    !!post.description?.trim();

  useEffect(() => {
    if (!hasDraft || isUploading) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasDraft, isUploading]);

  const requestExit = () => {
    if (isUploading) return;
    if (hasDraft) {
      setExitConfirmationOpen(true);
      return;
    }
    navigate("/user-home-page");
  };

  const handleSubmitClick = async () => {
    if (!selectedFile) {
      setCurrentStep(1);
      dispatch(showMessage("Choose a display photo before publishing."));
      return;
    }
    if (!post.account) {
      setCurrentStep(2);
      dispatch(showMessage("Confirm the store before publishing."));
      return;
    }
    if (!stepValidity[3]) {
      setCurrentStep(3);
      dispatch(showMessage("Add a brand and product type."));
      return;
    }
    if (post.totalCaseCount < 1) {
      setCurrentStep(3);
      setQuantityConfirmationOpen(true);
      return;
    }

    setUploadProgress(0);
    setIsUploading(true);

    try {
      await handlePostSubmission(
        post,
        selectedFile,
        setIsUploading,
        setUploadProgress,
        setUploadStatusText,
        galloEnabled ? selectedGalloGoal : undefined,
      );
      navigate("/user-home-page");
    } catch (error) {
      console.error("Upload failed:", error);
      dispatch(
        showMessage(
          error instanceof Error
            ? error.message
            : "The display could not be published.",
        ),
      );
    }
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <UploadImage
          setSelectedFile={setSelectedFile}
          post={post}
          setPost={setPost}
        />
      );
    }

    if (currentStep === 2) {
      return (
        <PickStore
          post={post}
          setPost={setPost}
          handleFieldChange={handleFieldChange}
          setSelectedCompanyAccount={setSelectedCompanyAccount}
          setSelectedGalloGoal={setSelectedGalloGoal}
          prefetchedNearbyStores={storePrefetch.nearbyStores}
          isPrefetchingNearbyStores={storePrefetch.isFindingNearbyStores}
          nearbyStorePrefetchError={storePrefetch.nearbyStoreError}
        />
      );
    }

    if (currentStep === 3) {
      return (
        <div className="create-post-step-stack">
          <SetDisplayDetails
            post={post}
            setPost={setPost}
            handleTotalCaseCountChange={handleTotalCaseCountChange}
          />
          <DisplayDescription
            post={post}
            isSupplier={isSupplier}
            handleFieldChange={handleFieldChange}
          />
        </div>
      );
    }

    return (
      <ReviewAndSubmit
        post={post}
        handleFieldChange={handleFieldChange}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadStatusText={uploadStatusText}
        onEditStep={setCurrentStep}
      />
    );
  };

  return (
    <>
      <CreatePostHelmet />
      <Container disableGutters maxWidth={false} className="create-post-container">
        <header className="create-post-header">
          <div>
            <span className="create-post-eyebrow">New field display</span>
            <h1>Create a post</h1>
            <p>{steps[currentStep - 1].helper}</p>
          </div>
          <button
            type="button"
            className="create-post-close"
            aria-label="Close Create Post"
            onClick={requestExit}
            disabled={isUploading}
          >
            <CancelRounded />
          </button>
        </header>

        <nav className="create-post-stepper" aria-label="Create Post progress">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCurrent = stepNumber === currentStep;
            const isComplete = stepNumber < currentStep;
            return (
              <button
                type="button"
                key={step.label}
                className={[
                  "create-post-step",
                  isCurrent ? "create-post-step--current" : "",
                  isComplete ? "create-post-step--complete" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isCurrent ? "step" : undefined}
                disabled={!isComplete || isUploading}
                onClick={() => isComplete && setCurrentStep(stepNumber)}
              >
                <span>{isComplete ? "✓" : stepNumber}</span>
                <strong>{step.label}</strong>
              </button>
            );
          })}
        </nav>

        <main className="create-post-body">
          {canPostOnBehalf(userData) && (
            <div className="create-post-owner-context">
              <span>Posting for</span>
              <CreatePostOnBehalfOfOtherUser
                onBehalf={onBehalf}
                setOnBehalf={setOnBehalf}
                handleFieldChange={handleFieldChange}
              />
            </div>
          )}

          {post.autoDetectedBrands === undefined && post.imageUrl && (
            <div className="create-post-inline-status">
              Analyzing the photo for brand suggestions…
            </div>
          )}
          {post.autoDetectedBrands && post.autoDetectedBrands.length > 0 && (
            <div className="create-post-inline-status create-post-inline-status--success">
              Detected {post.autoDetectedBrands.join(", ")}
            </div>
          )}

          <section className="create-post-step-content">
            {renderStepContent()}
          </section>

          <nav className="create-post-navigation" aria-label="Step controls">
            <button
              type="button"
              className="create-post-back"
              onClick={() =>
                setCurrentStep((step) => Math.max(1, step - 1))
              }
              disabled={currentStep === 1 || isUploading}
            >
              Back
            </button>
            <span className="create-post-navigation__status">
              Step {currentStep} of {steps.length}
            </span>
            <button
              type="button"
              className="create-post-next"
              onClick={() => {
                if (currentStep === 3) {
                  if (quantityWasEdited && post.totalCaseCount >= 1) {
                    setCurrentStep(4);
                  } else {
                    setQuantityConfirmationOpen(true);
                  }
                } else if (currentStep < steps.length) {
                  setCurrentStep((step) => step + 1);
                } else {
                  void handleSubmitClick();
                }
              }}
              disabled={isUploading || !canGoNext}
            >
              {currentStep < steps.length
                ? currentStep === 3
                  ? "Review display"
                  : "Continue"
                : isUploading
                  ? `Publishing ${Math.round(uploadProgress)}%`
                  : "Publish display"}
            </button>
          </nav>
        </main>
      </Container>

      <CustomConfirmation
        isOpen={quantityConfirmationOpen}
        title="Confirm the display quantity"
        message="Take one more look at the display and enter the total cases or units shown. Quantity cannot be left at zero."
        confirmLabel="Confirm quantity & review"
        confirmDisabled={post.totalCaseCount < 1}
        onClose={() => setQuantityConfirmationOpen(false)}
        onConfirm={() => {
          if (post.totalCaseCount < 1) return;
          setQuantityConfirmationOpen(false);
          setCurrentStep(4);
        }}
      >
        <div className="quantity-checkpoint">
          <span>Quantity on display</span>
          <TotalCaseCount
            handleTotalCaseCountChange={handleTotalCaseCountChange}
            initialValue={post.totalCaseCount}
            minimum={0}
            label="Cases or units"
          />
          {post.totalCaseCount < 1 && (
            <small>Enter at least 1 to continue.</small>
          )}
        </div>
      </CustomConfirmation>

      <CustomConfirmation
        isOpen={exitConfirmationOpen}
        title="Discard this display?"
        message="Your selected photo and display details will be lost."
        confirmLabel="Discard draft"
        tone="warning"
        onClose={() => setExitConfirmationOpen(false)}
        onConfirm={() => navigate("/user-home-page")}
      />
    </>
  );
};

export default CreatePost;
