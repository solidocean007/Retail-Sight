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

  return (
    <Autocomplete
      options={accountNames}
      value={selectedValue ?? ""}
      inputValue={inputValue}
      open={open}
      onOpen={() => setOpen(inputValue.length > 0)}
      onClose={() => setOpen(false)}
      onInputChange={(_, val) => {
        onInputChange(val);
        setOpen(val.length > 0);
      }}
      onChange={(_, val) => onSelect(val ?? null)}
      filterOptions={(opts, { inputValue: iv }) =>
        opts.filter((opt) => {
          const normalizedOpt = normalize(opt);
          const normalizedIv = normalize(iv);

          // return true if all characters in normalizedIv appear in normalizedOpt in order
          let i = 0;
          for (const c of normalizedIv) {
            i = normalizedOpt.indexOf(c, i);
            if (i === -1) return false;
            i++;
          }
          return true;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Account Name"
          placeholder="e.g. Walmart #123"
        />
      )}
      fullWidth
      clearOnBlur={false}
      autoHighlight
      // sx={{ "& .MuiInputBase-root": { padding: 0 } }} // Removes extra MUI padding
    />
  );
};

export default AccountNameAutocomplete;
