// AccountDropDown.tsx
import { Autocomplete, TextField } from "@mui/material";
import { CompanyAccountType } from "../../utils/types";

interface AccountDropdownProps {
  onAccountSelect: (account: CompanyAccountType) => void;
  accounts: CompanyAccountType[] | undefined; // Accept accounts as props
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({ onAccountSelect, accounts }) => {
  console.log('accountdropdown accounts: ', accounts)
  return (
    <Autocomplete
      options={accounts} // 
      getOptionLabel={(account) =>
        `${account.accountName} - ${account.accountAddress}`
      }
      onChange={(e, value) => value && onAccountSelect(value)}
      renderInput={(params) => (
        <TextField {...params} label="Select Account" variant="outlined" />
      )}
      sx={{ width: "100%", maxWidth: 400, margin: "0 auto" }}
    />
  );
};

export default AccountDropdown;