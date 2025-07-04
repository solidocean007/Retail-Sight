// UserFilterAutocomplete.tsx
import React, { useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useSelector } from "react-redux";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { UserType } from "../../utils/types";

interface UserFilterAutocompleteProps {
  inputValue: string;
  selectedUserId: string | null;
  onInputChange: (v: string) => void;
  onTypeChange: (v: string | null) => void;
}

export default function UserFilterAutocomplete({
  inputValue,
  selectedUserId,
  onInputChange,
  onTypeChange,
}: UserFilterAutocompleteProps) {
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const [open, setOpen] = useState(false);

  const filterFn = (opts: UserType[], params: { inputValue: string }) => {
    return opts.filter((u) =>
      `${u.firstName} ${u.lastName}`
        .toLowerCase()
        .includes(params.inputValue.toLowerCase())
    );
  };

  return (
    <Autocomplete<UserType, false, false, false>
      open={open}
      onOpen={() => {
        // console.log("[UserFilterAutocomplete] onOpen");
        setOpen(true);
      }}
      onClose={(_, reason) => {
        // console.log("[UserFilterAutocomplete] onClose", reason);
        if (["blur", "escape", "toggleInput"].includes(reason)) {
          setOpen(false);
        }
      }}
      options={companyUsers}
      getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
      filterOptions={filterFn}
      value={companyUsers.find((u) => u.uid === selectedUserId) || null}
      inputValue={inputValue}
      onInputChange={(_, v, reason) => {
        // console.log("[UserFilterAutocomplete] onInputChange", {
        //   newInput: v,
        //   reason,
        // });
        onInputChange(v);
        if (reason === "input") setOpen(v.length > 0);
      }}
      onChange={(_, u) => {
        // console.log("[UserFilterAutocomplete] onChange", u);
        onTypeChange(u?.uid ?? null);
        setOpen(false);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="User"
          placeholder="Type to search users"
          onBlur={() => {
            setOpen(false);
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.uid}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>
              {option.firstName} {option.lastName}
            </span>
            <span style={{ fontSize: "0.75em", color: "var(--text-color)" }}>
              {option.email}
            </span>
          </div>
        </li>
      )}
      fullWidth
      disablePortal
    />
  );
}
