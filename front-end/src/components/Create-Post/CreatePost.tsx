// CreatePost.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// import { Timestamp } from "firebase/firestore";
import { selectUser } from "../../Slices/userSlice";

// import ChannelSelector from "./ChannelSelector";
// import CategorySelector from "./CategorySelector";
import { AppBar, Container, IconButton } from "@mui/material";

// import StoreLocator from "./StoreLocator";
import { useHandlePostSubmission } from "../../utils/PostLogic/handlePostCreation";
import {
  CompanyAccountType,
  CompanyMissionType,
  MissionType,
  PostInputType,
  PostType,
  UserType,
} from "../../utils/types";
// import { CategoryType } from "./CategorySelector";
// import { ChannelType } from "./ChannelSelector";
// import { SupplierType } from "./SupplierSelector";
// import { BrandType } from "./BrandsSelector";
import "./createPost.css";
import LoadingIndicator from "./LoadingIndicator";
import { CreatePostHelmet } from "../../utils/helmetConfigurations";
import { UploadImage } from "./UploadImage";
import { PickStore } from "./PickStore";
import { SetDisplayDetails } from "./SetDisplayDetails";
import { DisplayDescription } from "./DisplayDescription";
import { ReviewAndSubmit } from "./ReviewAndSubmit";
import { showMessage } from "../../Slices/snackbarSlice";
import { RootState, useAppDispatch } from "../../utils/store";
import { MissionSelection } from "../MissionSelection/MissionSelection";
import CreatePostOnBehalfOfOtherUser from "./CreatePostOnBehalfOfOtherUser";
import { CancelRounded } from "@mui/icons-material";
import // selectUsersCompanyGoals,
// selectUsersGalloGoals,
"../../Slices/goalsSlice";
import {
  selectAllCompanyGoals,
  selectUsersCompanyGoals,
} from "../../Slices/companyGoalsSlice";

export const CreatePost = () => {
  const dispatch = useAppDispatch();
  const userData = useSelector(selectUser);
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false); // should i keep these here or move them to ReviewAndSubmit?
  const [uploadProgress, setUploadProgress] = useState(0); // same question?
  const [openMissionSelection, setOpenMissionSelection] = useState(false);

  // const usersGalloGoals = useSelector((state: RootState) =>
  //   selectUsersGalloGoals(state, salesRouteNum),
  // );

  const allCompanyGoals = useSelector(selectAllCompanyGoals);

  // Function to navigate to the next step
  const goToNextStep = () => setCurrentStep((prevStep) => prevStep + 1);

  // Function to navigate to the previous step
  const goToPreviousStep = () => setCurrentStep((prevStep) => prevStep - 1);

  const handlePostSubmission = useHandlePostSubmission();
  const companyId = userData?.companyId;

  const [onBehalf, setOnBehalf] = useState<UserType | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null); // does this belong here?  should i pass selectedFile to UploadImage?

  const [selectedCompanyAccount, setSelectedCompanyAccount] = // selectedCompanyAccount isnt used...
    useState<CompanyAccountType | null>(null);

  const [post, setPost] = useState<PostInputType>(() => ({
    brands: [],
    productType: [],
    description: "",
    imageUrl: "",
    totalCaseCount: 0,
    visibility: "company",
    postUser: userData || null,
    account: null,
  }));

  const [selectedCompanyMission, setSelectedCompanyMission] =
    useState<CompanyMissionType>();
  const [selectedMission, setSelectedMission] = useState<MissionType | null>(
    null
  );
  const navigate = useNavigate();

  useEffect(() => {
    setPost((prevPost) => ({
      ...prevPost,
      postedBy: onBehalf ?? null,
      postedByFirstName: onBehalf?.firstName || null,
      postedByLastName: onBehalf?.lastName || null,
      postedByUid: onBehalf?.uid || null,
    }));
  }, [onBehalf]);

  useEffect(() => {
    if (post.visibility === "supplier") {
      setOpenMissionSelection(true);
    } else {
      setOpenMissionSelection(false);
    }
  }, [post.visibility]);

  const onClose = () => {
    setOpenMissionSelection(false);
  };

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

  const supplierVisibility = post.visibility === "supplier";

  // Render different content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <UploadImage
            setSelectedFile={setSelectedFile}
            post={post}
            setPost={setPost}
            onNext={goToNextStep}
          />
        );
      case 2:
        return (
          <PickStore
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            post={post}
            setPost={setPost}
            // usersGalloGoals={usersGalloGoals}
            allCompanyGoals={allCompanyGoals}
            handleFieldChange={handleFieldChange}
            setSelectedCompanyAccount={setSelectedCompanyAccount}
          />
        );
      case 3:
        return (
          <SetDisplayDetails
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            post={post}
            setPost={setPost}
            handleTotalCaseCountChange={handleTotalCaseCountChange}
          />
        );
      case 4:
        return (
          <DisplayDescription
            post={post}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            handleFieldChange={handleFieldChange}
          />
        );
      // Additional cases for other steps
      default:
        return (
          <ReviewAndSubmit
            companyId={companyId}
            post={post}
            onPrevious={goToPreviousStep}
            handleFieldChange={handleFieldChange}
            setIsUploading={setIsUploading}
            uploadProgress={uploadProgress}
            selectedFile={selectedFile}
            setUploadProgress={setUploadProgress}
            handlePostSubmission={handlePostSubmission}
            selectedCompanyMission={selectedCompanyMission}
            selectedMission={selectedMission}
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
  return (
    <>
      <CreatePostHelmet />
      <Container disableGutters className="create-post-container">
        {isUploading && <LoadingIndicator progress={uploadProgress} />}
        <AppBar position="static" sx={appBarStyle}>
          <div className="create-post-header">
            <div
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <h1 style={{ marginLeft: "2rem" }}>Create Post</h1>
              <button
                className="close-button"
                aria-label="close"
                onClick={() => navigate("/user-home-page")}
              >
                <CancelRounded />
              </button>
            </div>

            {authToCreateOnBehalf && (
              <CreatePostOnBehalfOfOtherUser
                onBehalf={onBehalf}
                setOnBehalf={setOnBehalf}
                handleFieldChange={handleFieldChange}
              />
            )}
          </div>
        </AppBar>
        {renderStepContent()}
        {supplierVisibility && (
          <MissionSelection
            open={openMissionSelection}
            onClose={onClose}
            setSelectedCompanyMission={setSelectedCompanyMission}
            setSelectedMission={setSelectedMission}
          />
        )}
      </Container>
    </>
  );
};
