// CreatePost.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// import { Timestamp } from "firebase/firestore";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";

// import ChannelSelector from "./ChannelSelector";
// import CategorySelector from "./CategorySelector";
import {
  AppBar,
  Container,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
} from "@mui/material";

// import StoreLocator from "./StoreLocator";
import { useHandlePostSubmission } from "../../utils/PostLogic/handlePostCreation";
import {
  CompanyMissionType,
  MissionType,
  PostType,
  UserType,
} from "../../utils/types";
import { CategoryType } from "../CategorySelector";
import { ChannelType } from "../ChannelSelector";
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
import { useAppDispatch } from "../../utils/store";
import { MissionSelection } from "../MissionSelection/MissionSelection";
import CreatePostOnBehalfOfOtherUser from "./CreatePostOnBehalfOfOtherUser";
import { CancelRounded } from "@mui/icons-material";
import {
  getGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import {
  fetchUserGalloGoals,
  selectGalloGoals,
  setGalloGoals,
} from "../../Slices/goalsSlice";
import { setupUserGoalsListener } from "../../utils/listeners/setupGoalsListener";

export const CreatePost = () => {
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false); // should i keep these here or move them to ReviewAndSubmit?
  const [uploadProgress, setUploadProgress] = useState(0); // same question?
  const [openMissionSelection, setOpenMissionSelection] = useState(false);
  const galloGoals = useSelector(selectGalloGoals);
  // Function to navigate to the next step
  const goToNextStep = () => setCurrentStep((prevStep) => prevStep + 1);

  // Function to navigate to the previous step
  const goToPreviousStep = () => setCurrentStep((prevStep) => prevStep - 1);

  const handlePostSubmission = useHandlePostSubmission();

  const userData = useSelector(selectUser);
  const companyId = userData?.companyId;
  const [onBehalf, setOnBehalf] = useState<UserType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // does this belong here?  should i pass selectedFile to UploadImage?
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryType>("Beer"); // I need to store the last value by the user in local storage and try to use it again here
  const [selectedChannel, setSelectedChannel] =
    useState<ChannelType>("Grocery"); // I need to store the last value by the user in local storage and try to use it again here
  // const [selectedSupplier, setSelectedSupplier] = useState<SupplierType>({
  //   id: "",
  //   name: "",
  // });
  // const [selectedBrands, setSelectedBrands] = useState<BrandType[]>([]);

  const postUser = onBehalf || userData;
  const salesRouteNum = userData?.salesRouteNum;

  const [post, setPost] = useState<PostType>({
    accountNumber: "",
    category: selectedCategory,
    channel: selectedChannel,
    description: "",
    imageUrl: "",
    selectedStore: "",
    storeNumber: "",
    storeAddress: "",
    state: "",
    city: "",
    visibility: "company",
    supplier: "",
    brands: [],
    displayDate: "",
    timestamp: "",
    totalCaseCount: 0,
    postUserName: `${postUser?.firstName} ${postUser?.lastName}`,
    postUserId: postUser?.uid,
    postUserCompany: postUser?.company,
    postUserCompanyId: postUser?.companyId,
    postUserEmail: postUser?.email,
    likes: [],
    hashtags: [""],
    starTags: [""],
    commentCount: 0,
    token: { sharedToken: "", tokenExpiry: "" }, // i need to populate these values with valid values
    postCreatedBy: `${userData?.firstName} ${userData?.lastName}`,
  });

  const [selectedCompanyMission, setSelectedCompanyMission] =
    useState<CompanyMissionType>();
  const [selectedMission, setSelectedMission] = useState<MissionType | null>(
    null
  );
  const navigate = useNavigate();

// Fetch and listen for user goals.  i need to refactor this part to get company goals as well
useEffect(() => {
  if (!companyId || !salesRouteNum) return;

  const loadInitialGalloGoals = async () => {
    try {
      const savedGoals = await getGoalsFromIndexedDB();
      if (savedGoals.length > 0) {
        console.log(savedGoals, ': savedGoals') // logs the old goal
        dispatch(setGalloGoals(savedGoals));
      } else {
        const fetchedGoals = await dispatch(
          fetchUserGalloGoals({ companyId, salesRouteNum })
        ).unwrap();
        await saveGoalsToIndexedDB(fetchedGoals);
        dispatch(setGalloGoals(fetchedGoals));
        console.log(galloGoals, ': goals'); // this doesnt log
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  };

  loadInitialGalloGoals();

  // Set up the snapshot listener for real-time updates
  const unsubscribe = dispatch(setupUserGoalsListener(companyId, salesRouteNum));

  return () => unsubscribe(); // Clean up on unmount
}, [dispatch, companyId, salesRouteNum]);
  

  useEffect(() => {
    if (onBehalf) {
      setPost((prevPost) => ({
        ...prevPost,
        postUserName: `${onBehalf.firstName} ${onBehalf.lastName}`,
        postUserId: onBehalf.uid,
        postUserCompany: onBehalf.company,
        postUserCompanyId: onBehalf.companyId,
        postUserEmail: onBehalf.email,
      }));
    } else {
      setPost((prevPost) => ({
        ...prevPost,
        postUserName: `${userData?.firstName} ${userData?.lastName}`,
        postUserId: userData?.uid,
        postUserCompany: userData?.company,
        postUserCompanyId: userData?.companyId,
        postUserEmail: userData?.email,
      }));
    }
  }, [onBehalf, userData]);

  useEffect(() => {
    const storedCategory = localStorage.getItem(
      "postCategory"
    ) as CategoryType | null;
    if (storedCategory) {
      setSelectedCategory(storedCategory);
      setPost((prevPost) => ({ ...prevPost, category: storedCategory }));
    }
  }, []);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    setSelectedFile(file);
    if (file) {
      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (validImageTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPost({ ...post, imageUrl: reader.result as string });
        };
        dispatch(showMessage("Image selected successfully!"));
        reader.readAsDataURL(file);
      } else {
        dispatch(
          showMessage("Unsupported file type. Please upload a valid image.")
        );
      }
    }
  };

  const handleStoreNameChange = useCallback((storeName: string) => {
    setPost((prev) => ({ ...prev, selectedStore: storeName }));
  }, []);

  // const handleTotalCaseCountChange = useCallback((caseCount: number) => {
  //   setPost((prev) => ({ ...prev, totalCaseCount: caseCount }));
  // }, []);

  const handleStoreNumberChange = useCallback((newStoreNumber: string) => {
    // should i pass these to components or just use handleFieldChange?
    setPost((prev) => ({ ...prev, storeNumber: newStoreNumber }));
  }, []);

  const handleStoreAddressChange = useCallback((address: string) => {
    setPost((prev) => ({ ...prev, storeAddress: address }));
  }, []);

  const handleStoreCityChange = useCallback((city: string) => {
    setPost((prev) => ({ ...prev, city: city }));
  }, []);

  const handleStoreStateChange = useCallback((newStoreState: string) => {
    setPost((prev) => ({ ...prev, state: newStoreState }));
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

  // Add handlers for Supplier and Brand changes
  // const handleSupplierChange = (supplierId: string) => {
  //   setSelectedSupplier(supplierId);
  //   // Update the post object
  //   setPost((prev) => ({ ...prev, supplier: supplierId }));
  // };

  // const handleBrandChange = (brandId: string) => {
  //   // If you're allowing multiple brands, you'll need logic to handle selection and deselection
  //   setSelectedBrands((prevBrands) => {
  //     // This is just an example logic, assuming you want to toggle brands in the selection
  //     if (prevBrands.includes(brandId)) {
  //       return prevBrands.filter((id) => id !== brandId);
  //     } else {
  //       return [...prevBrands, brandId];
  //     }
  //   });
  //   // Update the post object
  //   setPost((prev) => ({ ...prev, brands: selectedBrands }));
  // };

  // Render different content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <UploadImage
            onNext={goToNextStep}
            post={post}
            handleImageChange={handleImageChange}
          />
        );
      case 2:
        return (
          <PickStore
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            post={post}
            setPost={setPost}
            goals={galloGoals}
            handleFieldChange={handleFieldChange}
            onStoreNameChange={handleStoreNameChange}
            onStoreNumberChange={handleStoreNumberChange}
            onStoreAddressChange={handleStoreAddressChange}
            onStoreCityChange={handleStoreCityChange}
            onStoreStateChange={handleStoreStateChange}
          />
        );
      case 3:
        return (
          <SetDisplayDetails
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
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
    userData?.role === "admin" || userData?.role === "super-admin";

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
              <IconButton
                aria-label="close"
                onClick={() => navigate("/user-home-page")}
              >
                <CancelRounded />
              </IconButton>
            </div>

            {authToCreateOnBehalf && (
              <CreatePostOnBehalfOfOtherUser
                onBehalf={onBehalf}
                setOnBehalf={setOnBehalf}
                setPost={setPost}
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
