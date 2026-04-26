// UserFilterAutocomplete.tsx
import React, { useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { UserType } from "../../utils/types";

type FilterUserOption = UserType & {
  originCompanyName?: string;
};

interface UserFilterAutocompleteProps {
  options: FilterUserOption[];
  inputValue: string;
  selectedUserId: string | null;
  onInputChange: (v: string) => void;
  onTypeChange: (v: string | null) => void;
  loading?: boolean;
}

export default function UserFilterAutocomplete({
  options,
  inputValue,
  selectedUserId,
  onInputChange,
  onTypeChange,
  loading = false,
}: UserFilterAutocompleteProps) {
  const [open, setOpen] = useState(false);

  const selectedUser = options.find((u) => u.uid === selectedUserId) || null;

  return (
    <Autocomplete<FilterUserOption, false, false, false>
      open={open}
      onOpen={() => setOpen(inputValue.length > 0)}
      onClose={(_, reason) => {
        if (["blur", "escape", "toggleInput", "selectOption"].includes(reason)) {
          setOpen(false);
        }
      }}
      options={options}
      loading={loading}
      getOptionLabel={(u) => {
        const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
        return u.originCompanyName ? `${name} (${u.originCompanyName})` : name;
      }}
      filterOptions={(opts, params) => {
        const search = params.inputValue.toLowerCase().trim();

        return opts.filter((u) => {
          const label = `${u.firstName || ""} ${u.lastName || ""} ${
            u.email || ""
          } ${u.originCompanyName || ""}`.toLowerCase();

          return label.includes(search);
        });
      }}
      value={selectedUser}
      inputValue={inputValue}
      onInputChange={(_, v, reason) => {
        onInputChange(v);
        if (reason === "input") setOpen(v.length > 0);
      }}
      onChange={(_, u) => {
        onTypeChange(u?.uid ?? null);
        onInputChange(
          u
            ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
            : ""
        );
        setOpen(false);
      }}
      isOptionEqualToValue={(option, value) => option.uid === value.uid}
      renderInput={(params) => (
        <TextField
          {...params}
          label="User"
          placeholder="Type to search users"
          onBlur={() => setOpen(false)}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={`${option.companyId || "own"}-${option.uid}`}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>
              {option.firstName} {option.lastName}
              {option.originCompanyName ? ` (${option.originCompanyName})` : ""}
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