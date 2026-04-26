// ChainNameAutocomplete.tsx
import React, { useMemo, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";

interface ChainNameAutocompleteProps {
  options: string[];
  selectedValue: string | null | undefined;
  onSelect: (value: string | null) => void;
}

const ChainNameAutocomplete: React.FC<ChainNameAutocompleteProps> = ({
  options,
  selectedValue,
  onSelect,
}) => {
  const [inputValue, setInputValue] = useState("");

  const cleanOptions = useMemo(() => {
    const counts = new Map<string, number>();

    options.forEach((option) => {
      const clean = option?.trim();
      if (!clean) return;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });

    const sortedByCount = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    const topTwenty = sortedByCount.slice(0, 20).map(([chain]) => chain);
    const all = [...counts.keys()].sort();

    return inputValue.trim()
      ? all.filter((chain) =>
          chain.toLowerCase().includes(inputValue.toLowerCase()),
        )
      : topTwenty;
  }, [options, inputValue]);

  return (
    <Autocomplete
      freeSolo
      options={cleanOptions}
      value={selectedValue || ""}
      inputValue={inputValue}
      onInputChange={(_, newInput) => setInputValue(newInput)}
      onChange={(_, newValue) => onSelect(newValue || null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Chain Name"
          variant="outlined"
          size="small"
        />
      )}
    />
  );
};

export default ChainNameAutocomplete;