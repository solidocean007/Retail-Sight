import React, { useMemo, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { CompanyAccountType } from "../../utils/types";

interface Props {
  inputValue: string;
  selectedValue: string | null | undefined;
  onInputChange: (val: string) => void;
  onSelect: (val: string | null) => void;
}

const normalize = (str: string) => str.toLowerCase().replace(/[\s\-]+/g, "");

const AccountNameAutocomplete: React.FC<Props> = ({
  inputValue,
  selectedValue,
  onInputChange,
  onSelect,
}) => {
  const allAccounts = useSelector(
    (state: RootState) => state.allAccounts.accounts
  ) as CompanyAccountType[];

   const [open, setOpen] = useState<boolean>(false);

  // const userAccounts = useSelector(
  //   (state: RootState) => state.userAccounts.accounts
  // ) as CompanyAccountType[];

  // console.log('userAccounts: ', userAccounts)

  const accountNames = useMemo(() => {
    const set = new Set<string>();
    allAccounts.forEach((acc) => {
      if (acc.accountName) set.add(acc.accountName.trim());
    });
    return Array.from(set).sort();
  }, [allAccounts]);

  // console.log("[AccountAutocomplete] allAccounts from Redux:", allAccounts);


  return (
    <Autocomplete
      options={accountNames}
      value={selectedValue ?? ""}
      inputValue={inputValue}
      onInputChange={(_, val) => onInputChange(val)}
      onChange={(_, val) => onSelect(val ?? null)}
      renderInput={(params) => (
        <TextField {...params} label="Account Name" placeholder="e.g. Walmart #123" />
      )}
      fullWidth
      clearOnBlur={false}
      autoHighlight
    />
  );
};

export default AccountNameAutocomplete;
