import React, { useMemo, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";

interface Props {
  options: string[];
  selectedValue: string | null | undefined;
  onSelect: (val: string | null) => void;
}

const AccountTypeSelect: React.FC<Props> = ({
  options,
  selectedValue,
  onSelect,
}) => {
  const [inputValue, setInputValue] = useState("");

  const filteredOptions = useMemo(() => {
    const counts = new Map<string, number>();

    options.forEach((option) => {
      const clean = option?.trim();
      if (!clean) return;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });

    const sortedByCount = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    const topTwenty = sortedByCount.slice(0, 20).map(([type]) => type);
    const all = [...counts.keys()].sort();

    return inputValue.trim()
      ? all.filter((type) =>
          type.toLowerCase().includes(inputValue.toLowerCase()),
        )
      : topTwenty;
  }, [options, inputValue]);

  return (
    <Autocomplete
      freeSolo
      options={filteredOptions}
      value={selectedValue || ""}
      inputValue={inputValue}
      onInputChange={(_, newInput) => setInputValue(newInput)}
      onChange={(_, newVal) => onSelect(newVal ?? null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Account Type"
          placeholder="e.g. SUPERMARKET"
        />
      )}
    />
  );
};

export default AccountTypeSelect;