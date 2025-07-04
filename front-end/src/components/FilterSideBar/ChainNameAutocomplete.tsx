// ChainNameAutocomplete.tsx
import React, { useMemo, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { CompanyAccountType } from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";

interface ChainNameAutocompleteProps {
  // inputValue: string;
  selectedValue: string | null | undefined;
  // onInputChange: (value: string) => void;
  onSelect: (value: string | null) => void;
  // allAccounts: CompanyAccountType[];
}

const ChainNameAutocomplete: React.FC<ChainNameAutocompleteProps> = ({
  // inputValue,
  selectedValue,
  // onInputChange,
  onSelect,
  // allAccounts,
}) => {
  const allAccounts = useSelector(
    (state: RootState) => state.allAccounts.accounts
  ) as CompanyAccountType[];
  const { topTwentyChains, allChains } = useMemo(() => {
    const counts = new Map<string, number>();
    allAccounts.forEach((acc) => {
      const chain = acc.chain?.trim();
      if (chain) {
        counts.set(chain, (counts.get(chain) || 0) + 1);
      }
    });

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    return {
      topTwentyChains: sorted.slice(0, 20).map(([chain]) => chain),
      allChains: [...counts.keys()].sort(),
    };
  }, [allAccounts]);

  const [inputValue, setInputValue] = useState("");

  // // Extract unique chain names
  // const chainNames = Array.from(
  //   new Set(
  //     allAccounts
  //       .map((acc) => acc.chain?.trim())
  //       .filter((name): name is string => !!name && name.length > 0)
  //   )
  // ).sort();

  // Dynamic filtering: show top 5 only when not typing
  const filteredOptions = inputValue.trim()
    ? allChains.filter((chain) =>
        chain.toLowerCase().includes(inputValue.toLowerCase())
      )
    : topTwentyChains;

  return (
    <Autocomplete
      freeSolo
      options={filteredOptions}
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
