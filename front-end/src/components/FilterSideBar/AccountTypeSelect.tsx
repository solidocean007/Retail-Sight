import React, { useMemo, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { CompanyAccountType } from "../../utils/types";

interface Props {
  selectedValue: string | null | undefined;
  onSelect: (val: string | null) => void;
}

const AccountTypeSelect: React.FC<Props> = ({ selectedValue, onSelect }) => {
  const allAccounts = useSelector(
    (state: RootState) => state.allAccounts.accounts
  ) as CompanyAccountType[];

  const { topFiveTypes, allTypes } = useMemo(() => {
    const counts = new Map<string, number>();
    allAccounts.forEach((acc) => {
      const type = acc.typeOfAccount?.trim();
      if (type) {
        counts.set(type, (counts.get(type) || 0) + 1);
      }
    });

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    return {
      topFiveTypes: sorted.slice(0, 20).map(([type]) => type),
      allTypes: [...counts.keys()].sort(),
    };
  }, [allAccounts]);

  const [inputValue, setInputValue] = useState("");

  // Dynamic filtering: show top 5 only when not typing
  const filteredOptions = inputValue.trim()
    ? allTypes.filter((type) =>
        type.toLowerCase().includes(inputValue.toLowerCase())
      )
    : topFiveTypes;

  return (
    <Autocomplete
      freeSolo
      options={filteredOptions}
      value={selectedValue || ""}
      inputValue={inputValue}
      onInputChange={(_, newInput) => setInputValue(newInput)}
      onChange={(_, newVal) => onSelect(newVal ?? null)}
      renderInput={(params) => (
        <TextField {...params} label="Account Type" placeholder="e.g. SUPERMARKET" />
      )}
    />
  );
};

export default AccountTypeSelect;
