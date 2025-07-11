import React, { useMemo } from "react";
import { Box, TextField, Autocomplete, createFilterOptions } from "@mui/material";
import { useSelector } from "react-redux";
import { PostInputType, UserType } from "../../utils/types";
import {
  selectCompanyUsers,
  selectUser,
} from "../../Slices/userSlice";

interface Props {
  onBehalf: UserType | null;
  setOnBehalf: React.Dispatch<React.SetStateAction<UserType | null>>;
  handleFieldChange: <K extends keyof PostInputType>(
    field: K,
    value: PostInputType[K]
  ) => void;
}

const CreatePostOnBehalfOfOtherUser: React.FC<Props> = ({
  onBehalf, // this should be the person the display is posted for.. so should be the new postuser and all flattened fields.
  setOnBehalf,
  handleFieldChange,
}) => {
  const userData = useSelector(selectUser)!; // this is the supervisor.. he should be set to postedBy
  const companyUsers = useSelector(selectCompanyUsers) || [];

  // Build sorted list (including current user)
 const options = useMemo(() => {
  const filtered = companyUsers.filter(
    (u) =>
      u.status !== "inactive" && u.salesRouteNum && u.uid !== userData.uid
  );

  const all = userData.status !== "inactive" && userData.salesRouteNum
    ? [userData, ...filtered]
    : filtered;

  return all.sort((a, b) => {
    const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.toLowerCase();
    const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
}, [companyUsers, userData]);


  const filter = createFilterOptions<UserType>({
  stringify: (option) =>
    `${option.firstName ?? ""} ${option.lastName ?? ""}`.toLowerCase(),
});

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
        filterOptions={filter} // ✅ custom filtering
        value={onBehalf || userData}
        onChange={(_, selected) => {
          setOnBehalf(selected);
          handleFieldChange("postUser" as any, selected);
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
