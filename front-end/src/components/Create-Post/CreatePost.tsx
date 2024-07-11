// CreatePost.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// import { Timestamp } from "firebase/firestore";
import { selectUser } from "../../Slices/userSlice";

// import ChannelSelector from "./ChannelSelector";
// import CategorySelector from "./CategorySelector";
import {
  AppBar,
  Snackbar,
} from "@mui/material";

// import StoreLocator from "./StoreLocator";
import { useHandlePostSubmission } from "../../utils/PostLogic/handlePostCreation";
import { PostType } from "../../utils/types";
import { CategoryType } from "../CategorySelector";
import { ChannelType } from "../ChannelSelector";
// import { SupplierType } from "./SupplierSelector";
// import { BrandType } from "./BrandsSelector";
import "./createPost.css";
import LoadingIndicator from "../LoadingIndicator";
import { CreatePostHelmet } from "../../utils/helmetConfigurations";
import { UploadImage } from "./UploadImage";
import { PickStore } from "./PickStore";
import { SetDisplayDetails } from "./SetDisplayDetails";
import { DisplayDescription } from "./DisplayDescription";
import { ReviewAndSubmit } from "./ReviewAndSubmit";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { MissionSelection } from "../MissionSelection/MissionSelection";

export const CreatePost = () => {
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false); // should i keep these here or move them to ReviewAndSubmit?
  const [uploadProgress, setUploadProgress] = useState(0); // same question?
  const [openMissionSelection, setOpenMissionSelection] = useState(false);

  // Function to navigate to the next step
  const goToNextStep = () => setCurrentStep((prevStep) => prevStep + 1);

  // Function to navigate to the previous step
  const goToPreviousStep = () => setCurrentStep((prevStep) => prevStep - 1);

  const handlePostSubmission = useHandlePostSubmission();

  const userData = useSelector(selectUser);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // does this belong here?  should i pass selectedFile to UploadImage?
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryType>("Beer"); // I need to store the last value by the user in localstorage and try to use it again here
  const [selectedChannel, setSelectedChannel] =
    useState<ChannelType>("Grocery");  // I need to store the last value by the user in localstorage and try to use it again here
  // const [selectedSupplier, setSelectedSupplier] = useState<SupplierType>({
  //   id: "",
  //   name: "",
  // });
  // const [selectedBrands, setSelectedBrands] = useState<BrandType[]>([]);
  const [post, setPost] = useState<PostType>({
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
    postUserName: `${userData?.firstName} ${userData?.lastName}`,
    postUserId: userData?.uid,
    postUserCompany: userData?.company,
    postUserCompanyId: userData?.companyId,
    postUserEmail: userData?.email,
    likes: [],
    hashtags: [""],
    starTags: [""],
    commentCount: 0,
    token: {sharedToken: '', tokenExpiry: ''} // i need to populate these values with valid values
  });

  useEffect(() => {
    if (post.visibility === "supplier") {
      setOpenMissionSelection(true);
    } else {
      setOpenMissionSelection(false);
    }
  }, [post.visibility]); 

  useEffect(() => {
    // Fetch suppliers and brands logic here
  }, []);

  // Logic
  const navigate = useNavigate();

  const onClose = () => {
    setOpenMissionSelection(false)
  }

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
        dispatch(showMessage('Image selected successfully!'));
        reader.readAsDataURL(file);
      } else {
        dispatch(showMessage(
          "Unsupported file type. Please upload a valid image."
        ));
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
        // add a picture.  need to make an upload image component
        return (
          <UploadImage
            onNext={goToNextStep}
            post={post}
            handleImageChange={handleImageChange}
          />
        );
      case 2:
        return (
          // select store
          <PickStore
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            post={post}
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
            handleFieldChange={handleFieldChange}
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
            post={post}
            onPrevious={goToPreviousStep}
            handleFieldChange={handleFieldChange}
            setIsUploading={setIsUploading}
            selectedFile={selectedFile}
            setUploadProgress={setUploadProgress}
            handlePostSubmission={handlePostSubmission}
            // selectedCategory={selectedCategory}
            // selectedChannel={selectedChannel}
          />
        );
    }
  };
  return (
    <>
      <CreatePostHelmet />
      <div className="create-post-container">
        {isUploading && <LoadingIndicator progress={uploadProgress} />}
        <AppBar className="app-bar" position="static">
          <div className="create-post-header">
          <div
            className="icon-button"
            onClick={() => navigate("/user-home-page")}
          >
            X
          </div>
          <h1>Create Post</h1>
          </div>
          
        </AppBar>
        {renderStepContent()}
        {supplierVisibility && <MissionSelection open={openMissionSelection} onClose={onClose} />}
      </div>
    </>
  );
};
