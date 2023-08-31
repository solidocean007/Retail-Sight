// handlePostLogic.ts
import { db } from "../utils/firebase"; // adjust the path as necessary
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { auth } from "../utils/firebase";
import { showMessage } from "../Slices/snackbarSlice"; // Adjust the path as necessary
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

export const handlePostSubmission = async () => {
  const user = auth.currentUser;
  if (!user) return; // No user, abort the function
  const uid = user.uid;
  console.log("User UID:", uid);
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
  const imageFileName = `${uid}-${Date.now()}.jpg`;
  const imagePath = `images/${formattedDate}/${uid}/${imageFileName}`;
  const hashtags = extractHashtags(description);
  console.log("Extracted Hashtags:", hashtags);

  try {
    const storage = getStorage();
    const storageRef = ref(storage, imagePath);

    // Fetch the user's data from Firestore
    const userDocRef = doc(db, "users", uid);
    const userDocSnapshot = await getDoc(userDocRef);
    const userData = userDocSnapshot.data();

    if (!userData) {
      console.error("User data not found for ID:", uid);
      return;
    }

    console.log("User Data from Firestore:", userData); // Logging fetched user data

    if (selectedFile) {
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          dispatch(
            showMessage(`Error uploading image. Please try again.${error}`)
          );
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          const postData = {
            description: description,
            imageUrl: downloadURL,
            postType: postType,
            timestamp: new Date().toISOString(),
            user: {
              name: `${userData.firstName} ${userData.lastName}`,
              company: userData.company,
              userId: uid,
              email: userData.email,
            },
            hashtags: hashtags,
            store: selectedStore,
          };

          console.log("Post Data to be added:", postData);

          await addDoc(collection(db, "posts"), postData);
          dispatch(showMessage("Post added successfully!"));

          // Navigate to another page or provide feedback to the user
          navigate("/userHomePage");
        }
      );
    }
  } catch (error) {
    console.error("Error adding post:", error);
  }
};

export const handleSelectedStoreLogic = (
  store: google.maps.places.PlaceResult, 
  storeAddress: string,
  setSelectedStore: (store: any) => void
) => {
  setSelectedStore({
    storeName: store.name,
    storeAddress: storeAddress,
  });
};


// handlePostLogic.ts

type HandleImageChangeProps = {
  e: React.ChangeEvent<HTMLInputElement>;
  setSelectedFile: (file: File | null) => void;
  setSelectedImage: (image: string | null) => void;
  setSnackbarMessage: (message: string) => void;
  setSnackbarOpen: (isOpen: boolean) => void;
};

export const handleImageChangeLogic = ({
  e,
  setSelectedFile,
  setSelectedImage,
  setSnackbarMessage,
  setSnackbarOpen,
}: HandleImageChangeProps) => {
  const file = e.target.files![0];

  if (file) {
    const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
    if (validImageTypes.includes(file.type)) {
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        console.log("Image Data:", reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSnackbarMessage(
        "Unsupported file type. Please upload a valid image."
      );
      setSnackbarOpen(true);
    }
  }
};


export const extractHashtags = (description: string) => {
  const hashtagPattern = /#\w+/g;
  return description.match(hashtagPattern) || [];
};