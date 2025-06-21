import {
  Box,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { useSelector } from "react-redux";
import { PostInputType, UserType } from "../../utils/types";
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
import { MenuOutlined } from "@mui/icons-material";

interface Props {
  onBehalf: UserType | null;
  setOnBehalf: React.Dispatch<React.SetStateAction<UserType | null>>;
  handleFieldChange: <K extends keyof PostInputType>(
    field: K,
    value: PostInputType[K]
  ) => void;
}

const CreatePostOnBehalfOfOtherUser: React.FC<Props> = ({
  onBehalf,
  setOnBehalf,
  handleFieldChange,
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
        where("companyId", "==", companyId),
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const usersFromFirestore = snapshot.docs.map(
            (doc) =>
              ({
                ...doc.data(),
                uid: doc.id,
              }) as UserType,
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
        },
      );

      // Return a cleanup function to unsubscribe from Firestore updates when the component unmounts
      return () => unsubscribe();
    };

    fetchData();
  }, [companyId, dispatch]);

  const handleOnBehalfSelect = (e: SelectChangeEvent<string>) => {
    const uid = e.target.value;
    const selected = companyUsers?.find(u => u.uid === uid) || null;
    setOnBehalf(selected);

    // If someone else is selected, override all the postUser fields
    if (selected) {
      handleFieldChange("postUserName", `${selected.firstName} ${selected.lastName}`);
      handleFieldChange("postUserId", selected.uid);
      handleFieldChange("postUserCompany", selected.company);
      handleFieldChange("postUserCompanyId", selected.companyId);
      handleFieldChange("postUserEmail", selected.email);
    } else {
      // revert back to yourself
      handleFieldChange("postUserName", `${userData.firstName} ${userData.lastName}`);
      handleFieldChange("postUserId", userData.uid);
      handleFieldChange("postUserCompany", userData.company);
      handleFieldChange("postUserCompanyId", userData.companyId);
      handleFieldChange("postUserEmail", userData.email);
    }
  };

  return (
    <Box sx={{ display: "flex", fontSize: "15px", flexDirection: "column" }}>
      <InputLabel htmlFor="onBehalf-select">For user:</InputLabel>
      <Select
        id="onBehalf-select"
        value={onBehalf?.uid || userData?.uid || ""}
        onChange={handleOnBehalfSelect}
        sx={{ width: "20rem", backgroundColor: "whitesmoke" }}
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
