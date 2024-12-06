import {
  Box,
  MenuItem,
  MenuList,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useSelector } from "react-redux";
import { PostType, UserType } from "../../utils/types";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
} from "../../Slices/userSlice";
import { useEffect } from "react";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../../utils/database/userDataIndexedDB";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { useAppDispatch } from "../../utils/store";

interface Props {
  onBehalf: UserType | null;
  setOnBehalf: React.Dispatch<React.SetStateAction<UserType | null>>;
  setPost: React.Dispatch<React.SetStateAction<PostType>>;
}

const CreatePostOnBehalfOfOtherUser: React.FC<Props> = ({
  onBehalf,
  setOnBehalf,
  setPost,
}) => {
  const dispatch = useAppDispatch();
  const userData = useSelector(selectUser);
  const companyId = userData?.companyId;
  const companyUsers = useSelector(selectCompanyUsers);

  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      // Check IndexedDB first
      const cachedUsers = await getCompanyUsersFromIndexedDB();
      if (cachedUsers) {
        // setLocalUsers(cachedUsers);
        dispatch(setCompanyUsers(cachedUsers));
      }

      // Firestore real-time subscription setup
      const q = query(
        collection(db, "users"),
        where("companyId", "==", companyId)
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const usersFromFirestore = snapshot.docs.map(
            (doc) =>
              ({
                ...doc.data(),
                uid: doc.id,
              } as UserType)
          );

          // Compare with IndexedDB data to see if there are changes
          const isDifferent =
            JSON.stringify(usersFromFirestore) !== JSON.stringify(cachedUsers);
          if (isDifferent) {
            dispatch(setCompanyUsers(usersFromFirestore)); // Update Redux store
            // setLocalUsers(usersFromFirestore); // Update local state

            // Save the updated list to IndexedDB
            await saveCompanyUsersToIndexedDB(usersFromFirestore);
          }
        },
        (error) => {
          console.error("Error fetching users:", error);
        }
      );

      // Return a cleanup function to unsubscribe from Firestore updates when the component unmounts
      return () => unsubscribe();
    };

    fetchData();
  }, [companyId, dispatch]);

  const handleOnBehalfChange = (event: SelectChangeEvent<string>) => {
    console.log(event);
    console.log(companyUsers);
    const selectedUid = event.target.value as string; // Explicitly cast to string
    console.log(selectedUid); // This should log the correct user UID

    const selectedUser = companyUsers?.find((user) => user.uid === selectedUid);

    console.log(selectedUser, ": selectedUser"); // Log the selected user

    setOnBehalf(selectedUser || null);

    if (selectedUser) {
      setPost((prevPost) => ({
        ...prevPost,
        postUserName: `${selectedUser.firstName} ${selectedUser.lastName}`,
        postUserId: selectedUser.uid,
        postUserCompany: selectedUser.company,
        postUserCompanyId: selectedUser.companyId,
        postUserEmail: selectedUser.email,
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
  };

  // Handle user selection for posting on behalf
  // const handleOnBehalfChange = (event: SelectChangeEvent<string>) => {
  //   console.log(event.target.value) // this logs undefined
  //   console.log(companyUsers) // this logs all the users correctly
  //   const selectedUser = companyUsers?.find(
  //     (user) => user.uid === event.target.value
  //   );
  //   setOnBehalf(selectedUser || null);
  //   console.log(selectedUser, ': selectedUser') // this logs undefined
  //   if (selectedUser) {
  //     setPost((prevPost) => ({
  //       ...prevPost,
  //       postUserName: `${selectedUser.firstName} ${selectedUser.lastName}`,
  //       postUserId: selectedUser.uid,
  //       postUserCompany: selectedUser.company,
  //       postUserCompanyId: selectedUser.companyId,
  //       postUserEmail: selectedUser.email,
  //     }));
  //   } else {
  //     setPost((prevPost) => ({
  //       ...prevPost,
  //       postUserName: `${userData?.firstName} ${userData?.lastName}`,
  //       postUserId: userData?.uid,
  //       postUserCompany: userData?.company,
  //       postUserCompanyId: userData?.companyId,
  //       postUserEmail: userData?.email,
  //     }));
  //   }
  // };

  return (
    <Box sx={{ display: "flex" }}>
      <h2>For user: </h2>
      <Select
        value={onBehalf?.uid || userData?.uid || ""}
        onChange={handleOnBehalfChange}
        sx={{ backgroundColor: onBehalf ? "whitesmoke" : "#f0f0f0", width: "20rem" }}
      >
        <MenuItem value={userData?.uid}>
          {`${userData?.firstName} ${userData?.lastName} (You)`}
        </MenuItem>
        {companyUsers?.map((user) => (
          <MenuItem key={user.uid} value={user.uid}>
            {`${user.firstName} ${user.lastName}`}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};

export default CreatePostOnBehalfOfOtherUser;
