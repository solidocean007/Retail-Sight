import React, { useEffect, useMemo } from "react";
import { Box, TextField, Autocomplete } from "@mui/material";
import { useSelector } from "react-redux";
import { PostInputType, UserType } from "../../utils/types";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
} from "../../Slices/userSlice";
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
  const userData = useSelector(selectUser)!;
  const companyId = userData.companyId!;
  const companyUsers = useSelector(selectCompanyUsers) || [];

  // Load & cache company users
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const cached = await getCompanyUsersFromIndexedDB();
      if (cached) dispatch(setCompanyUsers(cached));

      const q = query(
        collection(db, "users"),
        where("companyId", "==", companyId)
      );
      const unsub = onSnapshot(q, async (snap) => {
        const fresh = snap.docs.map(
          (d) => ({ ...(d.data() as any), uid: d.id } as UserType)
        );
        if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
          dispatch(setCompanyUsers(fresh));
          await saveCompanyUsersToIndexedDB(fresh);
        }
      });
      return () => unsub();
    })();
  }, [companyId, dispatch]);

  // Build sorted list (including current user)
  const options = useMemo(() => {
    const all = [
      userData,
      ...companyUsers.filter((u) => u.uid !== userData.uid),
    ];
    return all.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [companyUsers, userData]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: 320,
        marginTop: "15px",
      }}
    >
      <Autocomplete
        options={options}
        getOptionLabel={(u) =>
          u.uid === userData.uid
            ? `${u.firstName} ${u.lastName} (You)`
            : `${u.firstName} ${u.lastName}`
        }
        value={onBehalf || userData}
        onChange={(_, selected) => {
          setOnBehalf(selected);
          handleFieldChange("postedBy" as any, selected);
        }}
        clearOnEscape={false}
        disableClearable
        sx={{
          width: 320,
          // background behind the input box
          backgroundColor: "var(--input-bg)",

          // outline color
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--input-border)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--input-border-hover)",
          },

          // label color (floating & shrunk)
          "& .MuiInputLabel-root": {
            color: "var(--text-secondary)",
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "var(--text-primary)",
          },

          // the text you type
          "& .MuiAutocomplete-inputRoot .MuiInputBase-input": {
            color: "var(--text-primary)",
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="For user"
            variant="outlined"
            size="small"
            // force the filled bg & text
            InputProps={{
              ...params.InputProps,
              sx: {
                backgroundColor: "var(--input-bg)",
              },
            }}
            InputLabelProps={{
              sx: {
                color: "var(--text-secondary)",
                "&.Mui-focused": {
                  color: "var(--text-primary)",
                },
              },
            }}
          />
        )}
      />
    </Box>
  );
};

export default CreatePostOnBehalfOfOtherUser;
